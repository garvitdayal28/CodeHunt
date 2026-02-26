export default function DataTable({ columns, data, onRowClick, emptyMessage = 'No data found.' }) {
  return (
    <div className="card-surface bg-white border border-border rounded-xl shadow-xs overflow-hidden">
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
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-body-sm text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`
                    h-[48px] transition-colors duration-100
                    border-b border-border-light last:border-b-0
                    ${onRowClick ? 'cursor-pointer' : ''}
                    hover:bg-surface-sunken/60
                  `}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[14px] text-ink whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
