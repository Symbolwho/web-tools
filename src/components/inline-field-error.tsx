type InlineFieldErrorProps = {
  message: string
  id?: string
}

export function InlineFieldError({ message, id }: InlineFieldErrorProps) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-destructive">
      {message}
    </p>
  )
}
