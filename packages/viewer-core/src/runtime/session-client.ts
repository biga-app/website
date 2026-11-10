import {
    PROTOCOL_VERSION,
    type SessionClientOptions,
    type SessionConfig,
    type SessionPort,
    type WorkerRequest,
    type WorkerResponse,
} from "@biga/types";

type Message<Type extends WorkerRequest["type"]> = Omit<Extract<WorkerRequest, { type: Type }>, "version">;

export function createSessionClient(options: SessionClientOptions) {
    let port: SessionPort | null = null;
    let config: SessionConfig | null = null;
    let mismatches = 0;

    function send<Type extends WorkerRequest["type"]>(message: Message<Type>): void {
        port?.send({ ...message, version: PROTOCOL_VERSION } as WorkerRequest);
    }

    function attach(next: SessionPort): void {
        port = next;
        next.listen((response) => {
            if (port === next) receive(response);
        });
    }

    function replacePort(): void {
        port?.terminate();
        mismatches++;
        attach(mismatches === 1 ? (options.createPort() ?? options.createFallbackPort()) : options.createFallbackPort());
        if (config) send<"start">({ type: "start", config });
    }

    function receive(response: WorkerResponse): void {
        if (response.version !== PROTOCOL_VERSION) return replacePort();
        if (response.type === "unavailable") return options.onUnavailable(response.kind);
        const { id } = response.batch;
        options.onBatch(response.batch, () => send<"ack">({ type: "ack", id }));
    }

    return {
        start(next: SessionConfig): void {
            config = next;
            if (!port) attach(options.createPort() ?? options.createFallbackPort());
            send<"start">({ type: "start", config: next });
        },
        reconnect: () => send<"reconnect">({ type: "reconnect" }),
        retry: () => send<"retry">({ type: "retry" }),
        setHidden: (hidden: boolean) => send<"visibility">({ type: "visibility", hidden }),
        notifyOnline: () => send<"online">({ type: "online" }),
        stop(): void {
            send<"stop">({ type: "stop" });
            port?.terminate();
            port = null;
            config = null;
        },
    };
}
