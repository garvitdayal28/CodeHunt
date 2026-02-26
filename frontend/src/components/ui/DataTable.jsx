import { motion, AnimatePresence } from "motion/react";
import { TableSkeleton } from "./Skeleton";

export default function DataTable({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found.",
  loading = false,
  skeletonRows = 5,
  className = "",
}) {
  if (loading) {
    return <TableSkeleton columns={columns.length || 5} rows={skeletonRows} className={className} />;
  }

  return (
    <div className={`card-surface bg-white border border-border rounded-xl shadow-xs overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 text-left text-label-sm text-text-secondary"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {data.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-body-sm text-text-muted"
                  >
                    {emptyMessage}
                  </td>
                </motion.tr>
              ) : (
                data.map((row, i) => (
                  <motion.tr
                    key={row.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`
                      h-[48px] transition-colors duration-100
                      border-b border-border-light last:border-b-0
                      ${onRowClick ? "cursor-pointer" : ""}
                      hover:bg-surface-sunken/60
                    `}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-[14px] text-ink whitespace-nowrap"
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
