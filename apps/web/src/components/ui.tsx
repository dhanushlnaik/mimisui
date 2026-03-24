import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes
} from "react";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`persona-gradient rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${props.className ?? ""}`}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md border border-border bg-primary/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 ${props.className ?? ""}`}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 ${className ?? ""}`}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm outline-none ring-primary/30 transition focus:ring-2 ${props.className ?? ""}`}
    />
  );
}
