import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XCircleIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    FireIcon,
} from "@heroicons/react/24/outline";
import { useIngestionProgress, type FileProgress } from "../hooks/useIngestionProgress";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const statusMeta = (f: FileProgress) => {
    switch (f.status) {
        case "Waiting":
            return {
                icon: <ClockIcon className="w-5 h-5 text-sky-500" />,
                chip: "bg-sky-100 text-sky-700",
                bar: "bg-sky-500",
            };
        case "Ingesting":
            return {
                icon: <ArrowPathIcon className="w-5 h-5 text-indigo-500 animate-spin" />,
                chip: "bg-indigo-100 text-indigo-700",
                bar: "bg-indigo-500",
            };
        case "Done":
            return {
                icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
                chip: "bg-emerald-100 text-emerald-700",
                bar: "bg-emerald-500",
            };
        case "Failed":
            return {
                icon: <ExclamationCircleIcon className="w-5 h-5 text-rose-500" />,
                chip: "bg-rose-100 text-rose-700",
                bar: "bg-rose-500",
            };
    }
};

export const IngestionQueueModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { files } = useIngestionProgress();

    /* close on escape */
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const doneCount = files.filter((f) => f.status === "Done").length;
    const failCount = files.filter((f) => f.status === "Failed").length;
    const total = files.length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onMouseDown={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* ---- Header ---- */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500">
                                <DocumentTextIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Ingestion Queue</h2>
                                <p className="text-xs text-gray-500">
                                    {total === 0
                                        ? "Discovering files …"
                                        : `${doneCount + failCount} / ${total} completed`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Close"
                        >
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ---- Body ---- */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-10 pb-6">
                                <FireIcon className="w-12 h-12 text-amber-400 drop-shadow" />
                                <p className="mt-3 text-sm text-gray-600">Scanning directory for files …</p>
                            </div>
                        ) : (
                            files.map((f) => {
                                const meta = statusMeta(f);
                                return (
                                    <motion.div
                                        key={f.fileName}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md transition"
                                    >
                                        <div className="flex items-center gap-4">
                                            {meta.icon}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                                                {f.error && (
                                                    <p className="text-xs text-rose-600 mt-1">{f.error}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {f.elapsedMs != null && (f.status === "Done" || f.status === "Failed") && (
                                                <span className="text-xs text-gray-500">
                                                    {(f.elapsedMs / 1000).toFixed(2)} s
                                                </span>
                                            )}
                                            <span
                                                className={`px-3 py-1 text-xs font-semibold rounded-full ${meta.chip}`}
                                            >
                                                {f.status}
                                            </span>
                                        </div>

                                        {/* thin progress bar for ingesting */}
                                        {f.status === "Ingesting" && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl">
                                                <motion.div
                                                    className={`h-full ${meta.bar}`}
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: ["0%", "70%", "100%"] }}
                                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* ---- Footer ---- */}
                    <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50/70">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};