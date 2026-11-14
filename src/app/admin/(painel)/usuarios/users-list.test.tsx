import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@/lib/server/auth";

// Acesso direto a /admin/usuarios: usa o requireOwner de verdade, com cookie e sessão simulados.
const state = vi.hoisted(() => ({ user: null as AuthUser | null, listUsers: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@/lib/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/server/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/auth")>()),
  findSessionUser: () => state.user,
}));
vi.mock("@/lib/server/users", () => ({ listUsers: state.listUsers }));
vi.mock("@/lib/actions/users", () => ({ createStaff: vi.fn(), resetStaffPassword: vi.fn(), deleteStaff: vi.fn() }));

import { redirect } from "next/navigation";
import { UsersList } from "./users-list";

const base: AuthUser = { id: 1, email: "a@b.com", name: "A", role: "owner", mustChangePassword: false, hasRecoveryCode: true };

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  state.listUsers.mockReset();
  state.listUsers.mockReturnValue({ ok: true, users: [] });
});

describe("/admin/usuarios", () => {
  it("o funcionário que abre o endereço direto vai para o Início", async () => {
    state.user = { ...base, id: 2, role: "staff" };
    await expect(UsersList()).rejects.toMatchObject({ url: "/admin" });
    expect(state.listUsers).not.toHaveBeenCalled();
  });

  it("sem sessão vai para o login", async () => {
    state.user = null;
    await expect(UsersList()).rejects.toMatchObject({ url: "/admin/entrar" });
  });

  it("o Responsável vê a lista", async () => {
    state.user = base;
    await expect(UsersList()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(state.listUsers).toHaveBeenCalledTimes(1);
  });
});
