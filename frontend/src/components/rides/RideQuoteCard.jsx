import { motion } from "motion/react";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function RideQuoteCard({
  ride,
  loading,
  onAccept,
  onReject,
  onSubmitQuote,
}) {
  if (!ride) return null;

  if (ride.status === "ACCEPTED_PENDING_QUOTE") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-gold/30 bg-gold/5">
          <h3 className="text-label-lg text-ink mb-3">Send Quote</h3>
          {onSubmitQuote}
        </Card>
      </motion.div>
    );
  }

  if (ride.status !== "QUOTE_SENT") return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-gold/30 bg-gold/5">
        <h3 className="text-label-lg text-ink mb-2">Quote Received</h3>
        <p className="text-[14px] text-text-secondary mb-4">
          Driver quoted{" "}
          <span className="font-semibold text-ink">
            {ride.currency || "INR"} {ride.quoted_price}
          </span>
        </p>
        {ride.quote_note && (
          <p className="text-[13px] text-text-secondary mb-4">
            Note: {ride.quote_note}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button loading={loading} onClick={onAccept}>
            Accept Quote
          </Button>
          <Button variant="secondary" onClick={onReject}>
            Reject
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
