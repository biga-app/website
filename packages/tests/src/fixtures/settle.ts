export async function settle(rounds = 6): Promise<void> {
    for (let round = 0; round < rounds; round++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
}
