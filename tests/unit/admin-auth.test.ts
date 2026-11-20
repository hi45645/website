import { beforeEach, expect, it, vi } from "vitest";
import { updateAppointment } from "@/app/admin/(protected)/appointments/[id]/actions";
import { changeAppointment } from "@/lib/appointments";
import { requireAdmin } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/appointments", () => ({ changeAppointment: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("checks authorization before processing an appointment mutation", async () => {
  const denied = new Error("Sign-in required");
  vi.mocked(requireAdmin).mockRejectedValueOnce(denied);
  const form = new FormData();
  form.set("operation", "CANCELLED");
  await expect(updateAppointment("test-appointment", {}, form)).rejects.toBe(denied);
  expect(changeAppointment).not.toHaveBeenCalled();
});
