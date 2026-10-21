import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata={title:"SketchArena — Bad drawings. Great guesses.",description:"Your next game night starts with a doodle. Create a room, invite your friends, and play a real-time drawing and guessing game.",icons:{icon:"/icon.svg"}};
export const viewport:Viewport={themeColor:"#faf9f6"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
