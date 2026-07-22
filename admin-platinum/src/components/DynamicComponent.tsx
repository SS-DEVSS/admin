import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { CategoryAttributesTypes } from "@/models/category";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { createYearDate, extractYearFromDate } from "@/utils/applicationYear";

type getComponentProps = {
  type: CategoryAttributesTypes;
  name: string;
  required: boolean;
  value?: any;
  onChange?: (value: any) => void;
};

const DynamicComponent = ({ type, name, required, value, onChange }: getComponentProps) => {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);

  // Update date when value changes externally
  useEffect(() => {
    if (value && type === CategoryAttributesTypes.DATE) {
      setDate(new Date(value));
    }
  }, [value, type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    onChange?.(checked);
  };

  // Normalize type to handle backend variations
  const normalizedType = type?.toLowerCase() || "";

  // Handle numeric types (number, numeric, integer, decimal)
  if (
    normalizedType === "number" ||
    normalizedType === "numeric" ||
    normalizedType === "integer" ||
    normalizedType === "decimal" ||
    type === CategoryAttributesTypes.NUMERIC
  ) {
    return (
      <Input
        required={required}
        className="mt-1"
        type="number"
        placeholder={`Ingresa ${name}...`}
        value={value || ""}
        onChange={handleInputChange}
      />
    );
  }

  // Handle string types (string, text)
  if (
    normalizedType === "string" ||
    normalizedType === "text" ||
    type === CategoryAttributesTypes.STRING
  ) {
    // Use textarea for TEXT type, Input for STRING
    if (normalizedType === "text") {
      return (
        <Textarea
          required={required}
          className="mt-1"
          placeholder={`Ingresa ${name}...`}
          value={value || ""}
          onChange={handleTextareaChange}
        />
      );
    }
    return (
      <Input
        required={required}
        className="mt-1"
        type="text"
        placeholder={`Ingresa ${name}...`}
        value={value || ""}
        onChange={handleInputChange}
      />
    );
  }

  // Handle date types
  if (
    normalizedType === "date" ||
    type === CategoryAttributesTypes.DATE
  ) {
    // Check if this is a year attribute - if so, show only the year
    const isYearAttribute = name.toLowerCase().includes("año") || 
                           name.toLowerCase().includes("anio") || 
                           name.toLowerCase().includes("year");
    
    if (isYearAttribute && value) {
      // For year attributes, extract and display only the year
      let yearValue = "";
      if (typeof value === "string") {
        // If it's already a year string (4 digits), use it
        if (/^\d{4}$/.test(value.trim())) {
          yearValue = value.trim();
        } else {
          const year = extractYearFromDate(value);
          if (year !== null) {
            yearValue = year.toString();
          }
        }
      } else if (value instanceof Date) {
        const year = extractYearFromDate(value);
        yearValue = year !== null ? year.toString() : "";
      } else if (typeof value === "number") {
        if (value >= 1900 && value <= 2100) {
          yearValue = value.toString();
        } else {
          const year = extractYearFromDate(value);
          if (year !== null) {
            yearValue = year.toString();
          }
        }
      }
      
      return (
        <Input
          required={required}
          className="mt-1"
          type="number"
          min="1900"
          max="2100"
          placeholder="1998"
          value={yearValue}
          onChange={(e) => {
            const year = parseInt(e.target.value, 10);
            if (!isNaN(year) && year >= 1900 && year <= 2100) {
              onChange?.(createYearDate(year));
            } else if (e.target.value === "") {
              onChange?.(null);
            }
          }}
        />
      );
    }
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal mt-1",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Selecciona una fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              onChange?.(selectedDate);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Handle boolean types
  if (
    normalizedType === "boolean" ||
    type === CategoryAttributesTypes.BOOLEAN
  ) {
    return (
      <div className="flex items-center space-x-2 mt-1">
        <Checkbox
          id={`checkbox-${name}`}
          checked={value === true || value === "true"}
          onCheckedChange={handleCheckboxChange}
        />
        <label
          htmlFor={`checkbox-${name}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {value === true || value === "true" ? "Sí" : "No"}
        </label>
      </div>
    );
  }

  // Default: return a text input for unknown types
  console.warn(`[DynamicComponent] Unknown attribute type: ${type}, using text input as fallback`);
  return (
    <Input
      required={required}
      className="mt-1"
      type="text"
      placeholder={`Ingresa ${name}...`}
      value={value || ""}
      onChange={handleInputChange}
    />
  );
};

export default DynamicComponent;
