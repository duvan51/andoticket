import { Button } from "@material-ui/core";
import React, { useRef, useEffect, useState } from "react";
import api from "../../services/api";

const LS_NAME = 'audioMessageRate';

export default function AudioPlayer({ url }) {
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState(parseFloat(localStorage.getItem(LS_NAME) || "1"));
    const [showButtonRate, setShowButtonRate] = useState(false);
    const [blobUrl, setBlobUrl] = useState("");

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = audioRate;
        }
        localStorage.setItem(LS_NAME, audioRate);
    }, [audioRate]);

    useEffect(() => {
        if (!url) return;
        let isMounted = true;

        const fetchAudio = async () => {
            try {
                const audioPath = url.startsWith("http")
                    ? url.replace(/^https?:\/\/[^\/]+/, "")
                    : url;

                const { data, headers } = await api.get(audioPath, {
                    responseType: "blob",
                });

                if (!isMounted) return;
                const contentType = headers["content-type"] || (url.endsWith(".ogg") ? "audio/ogg" : "audio/mp3");
                const bUrl = window.URL.createObjectURL(
                    new Blob([data], { type: contentType })
                );
                setBlobUrl(bUrl);
            } catch (err) {
                console.error("Error fetching audio blob:", err);
                if (isMounted) setBlobUrl(url);
            }
        };

        fetchAudio();

        return () => {
            isMounted = false;
        };
    }, [url]);

    useEffect(() => {
        const currentRef = audioRef.current;
        if (!currentRef) return;

        currentRef.onplaying = () => setShowButtonRate(true);
        currentRef.onpause = () => setShowButtonRate(false);
        currentRef.onended = () => setShowButtonRate(false);
    }, [blobUrl]);

    const toogleRate = () => {
        let newRate = 1;
        switch(audioRate) {
            case 0.5: newRate = 1; break;
            case 1: newRate = 1.5; break;
            case 1.5: newRate = 2; break;
            case 2: newRate = 0.5; break;
            default: newRate = 1; break;
        }
        setAudioRate(newRate);
    };

    const sourceUrl = blobUrl || url;

    return (
        <>
            <audio ref={audioRef} controls src={sourceUrl}>
                <source src={sourceUrl} type={url?.endsWith(".ogg") ? "audio/ogg" : "audio/mp3"} />
            </audio>
            {showButtonRate && (
                <Button style={{ marginLeft: "5px", marginTop: "-45px" }} onClick={toogleRate}>
                    {audioRate}x
                </Button>
            )}
        </>
    );
}