import { useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

export function parseSheetDate(value) {
  if (!value) return null;
  const [day, mon, year] = value.split("-");
  if (!day || !mon || !year) return null;
  const month = MONTH_MAP[mon];
  if (month === undefined) return null;
  return new Date(Number(year), month, Number(day));
}

const getBaseMonth = (dates) => {
  if (dates.length === 0) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const sorted = [...dates].sort((a, b) => a - b);
  const first = sorted[0];
  return new Date(first.getFullYear(), first.getMonth(), 1);
};

const buildMonth = (baseDate, monthOffset, parsedDates, selectedDate) => {
  const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const counts = parsedDates.reduce((acc, date) => {
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      return acc;
    }
    const key = date.getDate();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return { dayNumber: null };
    }
    return { dayNumber, count: counts[dayNumber] || 0 };
  });

  const selectedDay = selectedDate
    ? parseSheetDate(selectedDate)?.getDate()
    : null;

  return { year, month, cells, selectedDay };
};

export default function CalendarView({
  rows,
  selectedDate,
  onSelectDate,
  dateShiftMap,
  onDateShiftChange,
  shiftTypes
}) {
  const parsedDates = rows
    .map((row) => parseSheetDate(row["Date"]))
    .filter(Boolean);
  const [offset, setOffset] = useState(0);
  const baseMonth = getBaseMonth(parsedDates);
  const months = [0, 1, 2].map((index) =>
    buildMonth(baseMonth, offset + index, parsedDates, selectedDate)
  );

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <div>
          <h3>Shift activity</h3>
          <span className="calendar-sub">Multi-month view</span>
        </div>
        <div className="calendar-nav">
          <button type="button" onClick={() => setOffset((prev) => prev - 1)}>
            Prev
          </button>
          <button type="button" onClick={() => setOffset((prev) => prev + 1)}>
            Next
          </button>
        </div>
      </div>
      <div className="calendar-multi">
        {months.map((monthData) => (
          <div key={`${monthData.year}-${monthData.month}`} className="calendar-month">
            <div className="calendar-month-title">
              {MONTHS[monthData.month]} {monthData.year}
            </div>
            <div className="calendar-grid">
              {DAYS.map((day) => (
                <div key={day} className="calendar-cell calendar-day">
                  {day}
                </div>
              ))}
              {monthData.cells.map((cell, idx) => (
                <div
                  key={`${cell.dayNumber ?? "empty"}-${idx}`}
                  className={`calendar-cell${
                    cell.dayNumber === monthData.selectedDay ? " calendar-selected" : ""
                  }`}
                  onClick={() => {
                    if (!cell.dayNumber) return;
                    const dateKey = `${String(cell.dayNumber).padStart(2, "0")}-${MONTHS[
                      monthData.month
                    ].slice(0, 3)}-${monthData.year}`;
                    onSelectDate?.(dateKey);
                  }}
                >
                  {cell.dayNumber && (
                    <>
                      <span className="calendar-date">{cell.dayNumber}</span>
                      {cell.count > 0 && (
                        <span className="calendar-count">{cell.count} shifts</span>
                      )}
                      {selectedDate &&
                        parseSheetDate(selectedDate)?.getDate() === cell.dayNumber &&
                        parseSheetDate(selectedDate)?.getMonth() === monthData.month &&
                        parseSheetDate(selectedDate)?.getFullYear() ===
                          monthData.year && (
                          <div className="calendar-select">
                            <select
                              value={dateShiftMap?.[selectedDate] || ""}
                              onChange={(event) =>
                                onDateShiftChange?.(selectedDate, event.target.value)
                              }
                            >
                              <option value="">Select shift type</option>
                              {shiftTypes.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
