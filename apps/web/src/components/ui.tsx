import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes
} from "react";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-inner-shadow persona-gradient rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-border bg-surface-2/80 px-4 py-2 text-sm font-medium text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-surface-3/80 ${props.className ?? ""}`}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-border bg-card/88 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 ${className ?? ""}`}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-xl border border-border bg-surface-2/85 px-3 text-sm outline-none ring-primary/30 transition focus:ring-2 ${props.className ?? ""}`}
    />
  );
}
