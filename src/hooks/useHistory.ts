import { MAX_HISTORY } from "@/constants/constants";
import { useCallback, useMemo, useState } from "react";

export function useHistory<T>(initialValue: T) {
    const [history, setHistory] = useState<T[]>([initialValue]);
    const [index, setIndex] = useState(0);

    const save = useCallback((value: T) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, index + 1);
            newHistory.push(JSON.parse(JSON.stringify(value)));
            if (newHistory.length > MAX_HISTORY) {
                newHistory.shift();
                return newHistory;
            }
            return newHistory;
        });
        setIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [index]);

    const undo = useCallback(() => {
        if (index > 0) {
            setIndex(prev => prev - 1);
            return JSON.parse(JSON.stringify(history[index - 1]));
        }
        return null;
    }, [index, history]);

    const redo = useCallback(() => {
        if (index < history.length - 1) {
            setIndex(prev => prev + 1);
            return JSON.parse(JSON.stringify(history[index + 1]));
        }
        return null;
    }, [index, history]);

    const reset = useCallback((value: T) => {
        setHistory([JSON.parse(JSON.stringify(value))]);
        setIndex(0);
    }, []);

    return useMemo(() => ({
        save,
        undo,
        redo,
        reset,
        canUndo: index > 0,
        canRedo: index < history.length - 1
    }), [save, undo, redo, reset, index, history.length]);
}