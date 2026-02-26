import { useState } from "react";
import { Plane, Train, Search, MapPin, Calendar, Users, ArrowRight, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../../api/axios";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";

export default function TransportSearch() {
    const [mode, setMode] = useState("FLIGHT"); // FLIGHT or TRAIN
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [date, setDate] = useState("");
    const [travelers, setTravelers] = useState(1);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!origin || !destination) return;

        setLoading(true);
        setSearched(true);
        try {
            const res = await api.get("/search/transport", {
                params: { mode, origin, destination, date, travelers }
            });
            setResults(res.data?.data || []);
        } catch (err) {
            console.error("Transport search failed:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header & Mode Toggle */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-display-md text-ink">Search Flights & Trains</h1>
                    <p className="text-body-md text-text-secondary mt-1">
                        Discover the best routes and book your next journey.
                    </p>
                </div>

                <div className="flex bg-surface-sunken p-1 rounded-xl border border-border w-fit">
                    <button
                        onClick={() => { setMode("FLIGHT"); setResults([]); setSearched(false); }}
                        className={`
              flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all
              ${mode === "FLIGHT" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-ink"}
            `}
                    >
                        <Plane className="h-4 w-4" />
                        Flights
                    </button>
                    <button
                        onClick={() => { setMode("TRAIN"); setResults([]); setSearched(false); }}
                        className={`
              flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all
              ${mode === "TRAIN" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-ink"}
            `}
                    >
                        <Train className="h-4 w-4" />
                        Trains
                    </button>
                </div>
            </div>

            {/* Search Form Card */}
            <Card className="p-6! border-b-4 border-b-primary shadow-lg overflow-visible">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5 ml-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" /> From
                        </label>
                        <input
                            type="text"
                            required
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            placeholder={mode === "FLIGHT" ? "Airport Code (DEL)" : "Station Code"}
                            className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5 ml-1">
                            <MapPin className="h-3.5 w-3.5 text-accent" /> To
                        </label>
                        <input
                            type="text"
                            required
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder={mode === "FLIGHT" ? "Airport Code (BOM)" : "Station Code"}
                            className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5 ml-1">
                            <Calendar className="h-3.5 w-3.5 text-text-muted" /> Date
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5 ml-1">
                            <Users className="h-3.5 w-3.5 text-text-muted" /> Travelers
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={travelers}
                            onChange={(e) => setTravelers(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-border text-[14px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <Button type="submit" loading={loading} className="w-full h-11 rounded-xl shadow-md-primary">
                            <Search className="h-5 w-5" />
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Results Section */}
            <div className="space-y-4">
                {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="flex flex-col md:flex-row items-center gap-6 p-6">
                                <Skeleton className="h-12 w-32" rounded="lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-10 w-28" rounded="full" />
                            </Card>
                        ))}
                    </div>
                ) : searched && results.length === 0 ? (
                    <EmptyState
                        title="No transport options found"
                        description="Try adjusting your search criteria or dates. Real-time availability may vary."
                        icon={mode === "FLIGHT" ? Plane : Train}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence mode="popLayout">
                            {results.map((item, idx) => (
                                <motion.div
                                    key={`${item.provider}-${item.departure}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                >
                                    <Card className="group p-0 overflow-hidden hover:border-primary/30 transition-all">
                                        <div className="flex flex-col md:flex-row items-center p-6 gap-6 md:gap-8">
                                            {/* Provider Brand */}
                                            <div className="w-full md:w-32 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-8">
                                                <div className="h-12 w-12 rounded-xl bg-surface-sunken flex items-center justify-center mb-2">
                                                    {mode === "FLIGHT" ? (
                                                        <Plane className="h-6 w-6 text-primary" />
                                                    ) : (
                                                        <Train className="h-6 w-6 text-accent" />
                                                    )}
                                                </div>
                                                <span className="text-[12px] font-bold text-ink uppercase tracking-wider text-center">
                                                    {item.provider}
                                                </span>
                                            </div>

                                            {/* Journey Details */}
                                            <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 w-full">
                                                <div className="flex items-center gap-12 flex-1 justify-center md:justify-start">
                                                    <div className="text-center md:text-left">
                                                        <p className="text-[18px] font-bold text-ink">{item.departure}</p>
                                                        <p className="text-[12px] text-text-secondary font-medium">Origin</p>
                                                    </div>

                                                    <div className="flex flex-col items-center px-4 flex-1 max-w-[120px]">
                                                        <p className="text-[11px] text-text-muted font-medium mb-1">{item.duration}</p>
                                                        <div className="w-full h-px bg-border relative">
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                                                                <ArrowRight className="h-3 w-3 text-text-muted" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-success font-semibold mt-1">Non-stop</p>
                                                    </div>

                                                    <div className="text-center md:text-right">
                                                        <p className="text-[18px] font-bold text-ink">{item.arrival}</p>
                                                        <p className="text-[12px] text-text-secondary font-medium">Destination</p>
                                                    </div>
                                                </div>

                                                {/* Price & Action */}
                                                <div className="flex flex-col items-center md:items-end gap-3 border-t md:border-t-0 border-border pt-4 md:pt-0 w-full md:w-auto">
                                                    <div className="text-center md:text-right">
                                                        <p className="text-[22px] font-bold text-ink leading-none">
                                                            {item.currency} {item.price.toLocaleString()}
                                                        </p>
                                                        <p className="text-[11px] text-text-muted mt-1 font-medium">Incl. all taxes</p>
                                                    </div>
                                                    <a
                                                        href={item.booking_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex"
                                                    >
                                                        <Button size="sm" className="rounded-full shadow-lg hover:shadow-primary/20">
                                                            Book Now <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
