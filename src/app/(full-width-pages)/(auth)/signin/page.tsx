import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | Hệ thống quản lý khảo sát - Next.js Dashboard Template",
  description: "This is Next.js Signin Page Hệ thống quản lý khảo sát Dashboard Template",
};

export default function SignIn() {
  return <SignInForm />;
}
