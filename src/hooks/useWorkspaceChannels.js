import { useCallback, useEffect, useState } from "react";
import { createChannel, fetchChannels, getStoredChannels } from "@/lib/channels";
export function useWorkspaceChannels() {
    const [channels, setChannels] = useState(() => getStoredChannels());
    const [loading, setLoading] = useState(true);
    const refreshChannels = useCallback(async () => {
        setLoading(true);
        const nextChannels = await fetchChannels();
        setChannels(nextChannels);
        setLoading(false);
        return nextChannels;
    }, []);
    const addChannel = useCallback(async (input) => {
        const result = await createChannel(input);
        setChannels(getStoredChannels());
        return result;
    }, []);
    useEffect(() => {
        void refreshChannels();
    }, [refreshChannels]);
    useEffect(() => {
        const handleUpdate = (event) => {
            const detail = event.detail;
            if (Array.isArray(detail) && detail.length > 0) {
                setChannels(detail);
                return;
            }
            setChannels(getStoredChannels());
        };
        window.addEventListener("channels:updated", handleUpdate);
        return () => {
            window.removeEventListener("channels:updated", handleUpdate);
        };
    }, []);
    return { channels, loading, refreshChannels, addChannel };
}
