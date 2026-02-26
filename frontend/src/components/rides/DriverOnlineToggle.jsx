import Button from '../ui/Button';
import Card from '../ui/Card';

export default function DriverOnlineToggle({ online, city, onToggle, connected }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-label-lg text-ink">Driver Availability</h3>
          <p className="text-[13px] text-text-secondary mt-1">
            {connected ? 'Realtime connected' : 'Realtime disconnected'}{city ? ` - ${city}` : ''}
          </p>
        </div>
        <Button variant={online ? 'danger' : 'primary'} onClick={onToggle}>
          {online ? 'Go Offline' : 'Go Online'}
        </Button>
      </div>
    </Card>
  );
}
