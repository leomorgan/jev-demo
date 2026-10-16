import { Figtree } from "next/font/google";

// The bank app's typeface, exposed as --font-mz (used by .bank-theme in globals.css). A free face
// with the friendly geometric feel of modern app banks; no proprietary brand fonts.
export const bankSans = Figtree({
  variable: "--font-mz",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
