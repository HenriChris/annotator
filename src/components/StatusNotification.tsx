import { useEffect, useState } from "react";

export function StatusNotification({
    message,
    type,
}: {
    message: string;
    type: "success" | "error" | "info";
}) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
        const timer = setTimeout(() => setShow(false), 2000);
        return () => clearTimeout(timer);
    }, [message]);

    const baseStyles =
        "fixed bottom-5 right-5 px-5 py-3 rounded text-white text-sm z-[101] pointer-events-none";
    const animationStyles =
        "transform transition duration-300 ease-in-out";
    const visibleStyles = show
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-2";
    const bgColor =
        type === "success"
            ? "bg-green-600"
            : type === "error"
                ? "bg-red-500"
                : "bg-blue-500";

    return (
        <div className={`${baseStyles} ${animationStyles} ${visibleStyles} ${bgColor}`}>
            {message}
        </div>
    );
}
