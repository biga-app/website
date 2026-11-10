import { GeistPixelSquare } from "geist/font/pixel/square";
import { Bricolage_Grotesque, Manrope } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const siteFontClassName = `${bricolage.variable} ${manrope.variable} ${GeistPixelSquare.variable}`;
