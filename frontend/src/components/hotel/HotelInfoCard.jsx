import Card from '../ui/Card';

export default function HotelInfoCard({ title, icon: Icon, fields = [] }) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-surface-sunken">
            <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          </div>
        )}
        <h3 className="text-label-lg text-ink">{title}</h3>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
            <span className="text-[13px] text-text-secondary">{field.label}</span>
            <span className="text-[13px] font-medium text-ink text-right">{field.value || '-'}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
