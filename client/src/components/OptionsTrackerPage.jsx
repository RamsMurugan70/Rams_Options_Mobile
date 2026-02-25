import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, BarChart3, IndianRupee, ArrowUpDown } from 'lucide-react';

const API_URL = '/api/options';

const OptionsTrackerPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);
    const [symbol, setSymbol] = useState('NIFTY');

    const fetchData = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('symbol', symbol);
            if (refresh) params.set('refresh', 'true');
            const res = await axios.get(`${API_URL}/chain?${params.toString()}`);
            setData(res.data);
            setLastFetch(new Date());
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSymbolToggle = (newSymbol) => {
        if (newSymbol !== symbol) {
            setData(null);
            setSymbol(newSymbol);
        }
    };

    const formatNumber = (n) => {
        if (n === undefined || n === null) return '-';
        return new Intl.NumberFormat('en-IN').format(n);
    };

    const formatCurrency = (n) => {
        if (n === undefined || n === null) return '-';
        return `₹${n.toFixed(2)}`;
    };

    const OptionCard = ({ title, optionData, type, expiry }) => {
        if (!optionData) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-50">
                    <h4 className="font-semibold text-slate-400">{title}</h4>
                    <p className="text-sm text-slate-400 mt-2">No data available for this strike/expiry</p>
                </div>
            );
        }

        const isCE = type === 'CE';
        const Icon = isCE ? TrendingUp : TrendingDown;

        return (
            <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
                {/* Header */}
                <div className={`px-5 py-3 bg-gradient-to-r ${isCE ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600'} text-white`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Icon size={18} />
                            <span className="font-bold text-lg">{title}</span>
                        </div>
                        <span className="text-2xl font-black">{formatCurrency(optionData.ltp)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-white/80 text-xs">
                        <span>Strike: {formatNumber(optionData.strike)}</span>
                        <span className={`font-semibold ${optionData.change >= 0 ? 'text-white' : 'text-yellow-200'}`}>
                            {optionData.change >= 0 ? '+' : ''}{optionData.change?.toFixed(2)} ({optionData.pChange?.toFixed(2)}%)
                        </span>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Open Interest" value={formatNumber(optionData.oi)} icon={<BarChart3 size={14} />} />
                        <MetricBox label="OI Change" value={formatNumber(optionData.oiChange)} icon={<ArrowUpDown size={14} />}
                            valueColor={optionData.oiChange > 0 ? 'text-emerald-600' : optionData.oiChange < 0 ? 'text-rose-600' : ''} />
                        <MetricBox label="Volume" value={formatNumber(optionData.volume)} icon={<Activity size={14} />} />
                        <MetricBox label="IV" value={optionData.iv ? `${optionData.iv.toFixed(2)}%` : '-'} icon={<TrendingUp size={14} />} />
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-emerald-500 font-medium uppercase">Bid</div>
                                <div className="font-bold text-emerald-700">{formatCurrency(optionData.bid)}</div>
                                <div className="text-[10px] text-emerald-400">Qty: {formatNumber(optionData.bidQty)}</div>
                            </div>
                            <div className="bg-rose-50 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-rose-500 font-medium uppercase">Ask</div>
                                <div className="font-bold text-rose-700">{formatCurrency(optionData.ask)}</div>
                                <div className="text-[10px] text-rose-400">Qty: {formatNumber(optionData.askQty)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const MetricBox = ({ label, value, icon, valueColor = '' }) => (
        <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium uppercase mb-1">
                {icon} {label}
            </div>
            <div className={`font-bold text-slate-700 text-sm ${valueColor}`}>{value}</div>
        </div>
    );

    const expiryLabel = data?.expiryDay || (symbol === 'NIFTY' ? 'Tuesday' : 'Thursday');
    const spotLabel = data?.label || symbol;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Rams's Options Tracker
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Live OTM option premiums
                    </p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Symbol Toggle */}
                    <div className="flex overflow-x-auto bg-slate-100 rounded-lg p-0.5 whitespace-nowrap scrollbar-hide">
                        {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSymbolToggle(s)}
                                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${symbol === s
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {s === 'FINNIFTY' ? 'FINNIFTY' : s}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3">
                        {lastFetch && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock size={12} />
                                {lastFetch.toLocaleTimeString()}
                                {data?.cached && <span className="text-amber-500">(cached)</span>}
                            </span>
                        )}
                        <button
                            onClick={() => fetchData(true)}
                            disabled={loading}
                            className={`flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Fetching...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="text-rose-500" size={20} />
                    <span className="text-rose-700 text-sm">{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && !data && (
                <div className="text-center py-20">
                    <RefreshCw size={40} className="mx-auto text-brand-400 animate-spin mb-4" />
                    <p className="text-slate-500">Fetching live {symbol} data...</p>
                    <p className="text-slate-400 text-sm mt-1">This may take 10-15 seconds on first load</p>
                </div>
            )}

            {/* Data Display */}
            {data && (
                <div className="space-y-6">
                    {/* Spot Price Banner */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 md:p-6 text-white shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{spotLabel} Spot</p>
                                <p className="text-4xl font-black mt-1">{formatNumber(data.spot)}</p>
                                {data.anchorPrice && (
                                    <div className="mt-2 flex items-center gap-1.5 text-slate-400 bg-slate-800/50 py-1 px-2 rounded w-fit">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <p className="text-xs font-medium">Open: {formatNumber(data.anchorPrice)}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between md:text-right md:space-y-2 gap-4 md:gap-0">
                                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5 flex-1 md:flex-none">
                                    <p className="text-[10px] text-emerald-300 uppercase font-medium">CE Strike ({data.anchorPrice ? 'Open' : 'Spot'} + {data.strikeOffset || (symbol === 'NIFTY' ? 1000 : 3500)})</p>
                                    <p className="font-bold text-emerald-400 text-lg">{formatNumber(data.ceStrike)}</p>
                                </div>
                                <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg px-3 py-1.5 flex-1 md:flex-none">
                                    <p className="text-[10px] text-rose-300 uppercase font-medium">PE Strike ({data.anchorPrice ? 'Open' : 'Spot'} − {data.strikeOffset || (symbol === 'NIFTY' ? 1000 : 3500)})</p>
                                    <p className="font-bold text-rose-400 text-lg">{formatNumber(data.peStrike)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expiry Sections */}
                    {data.expiries?.map((exp, idx) => (
                        <div key={exp.expiry} className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <h2 className="text-lg font-bold text-slate-700">
                                    {data.expiryDay?.startsWith('Monthly')
                                        ? (idx === 0 ? '📅 This Month' : '📅 Next Month')
                                        : (idx === 0 ? `📅 This ${expiryLabel}` : `📅 Next ${expiryLabel}`)}
                                </h2>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold self-start md:self-auto">
                                    Expiry: {exp.expiry}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <OptionCard
                                    title={`${symbol === 'MIDCPNIFTY' ? 'MIDCAPNIFTY' : symbol} ${data.ceStrike} CE`}
                                    optionData={exp.ce}
                                    type="CE"
                                    expiry={exp.expiry}
                                />
                                <OptionCard
                                    title={`${symbol === 'MIDCPNIFTY' ? 'MIDCAPNIFTY' : symbol} ${data.peStrike} PE`}
                                    optionData={exp.pe}
                                    type="PE"
                                    expiry={exp.expiry}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OptionsTrackerPage;
