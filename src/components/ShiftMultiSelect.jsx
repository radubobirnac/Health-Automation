export default function ShiftMultiSelect({ value, options, onChange, ariaLabel = "Shift type" }) {
  return (
    <div className="single-select">
      <select
        className="single-select-input"
        value={value || ""}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select shift type</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
