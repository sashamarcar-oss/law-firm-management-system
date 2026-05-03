// types.ts
export type User = {
  id: string;
  name: string;
  email: string;
  role: | "lawyer" | "client";
  accessLevel: "View" | "Edit" | "admin";
};