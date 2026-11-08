export function ErrorMessage({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 p-3 font-medium text-red-800">
      {children}
    </p>
  )
}
