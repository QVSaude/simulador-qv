"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { ptBR } from "date-fns/locale"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  variant?: "idade" | "vigencia"
}

export function Calendar({
  variant = "vigencia",
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  return (
    <DayPicker
      mode="single"
      locale={ptBR}
      selected={selected}
      onSelect={onSelect}
      captionLayout={variant === "idade" ? "dropdown" : "label"}
      fromYear={1920}
      toYear={today.getFullYear()}
      disabled={
        variant === "idade"
          ? { after: today } // Desabilita datas futuras
          : { before: today } // Desabilita datas passadas
      }
      classNames={{
        months: "p-4",
        month: "space-y-4",
        day: "rounded-md hover:bg-primary/10 transition",
        nav_button: "text-primary hover:bg-primary/10 rounded-md",
        caption_label: "text-primary font-semibold",
      }}
      modifiersClassNames={{
        selected:
          "bg-accent text-primary-foreground hover:bg-accent/90",
        today:
          "border border-accent text-accent",
      }}
      {...props}
    />

  )
}