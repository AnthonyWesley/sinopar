import type { Metadata } from "next";
import { UsersList } from "./users-list";

export const metadata: Metadata = { title: "Usuários" };

// requireOwner fica em UsersList (funcionário vai para o Início).
export default function UsersPage() {
  return <UsersList />;
}
