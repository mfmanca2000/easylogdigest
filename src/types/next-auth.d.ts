import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: "ADMIN" | "AM";
    } & DefaultSession["user"];
  }
  interface User {
    role: "ADMIN" | "AM";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: "ADMIN" | "AM";
  }
}
