import { ImageResponse } from "next/og";

export const alt = "Cover Lover — Band Setlist Voting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "sans-serif",
                    gap: 24,
                }}
            >
                <div
                    style={{
                        background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                        borderRadius: 24,
                        width: 100,
                        height: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 56,
                    }}
                >
                    🎵
                </div>
                <div
                    style={{
                        color: "white",
                        fontSize: 72,
                        fontWeight: "bold",
                        letterSpacing: "-2px",
                    }}
                >
                    Cover Lover
                </div>
                <div
                    style={{
                        color: "#a78bfa",
                        fontSize: 32,
                        letterSpacing: "1px",
                    }}
                >
                    Band Setlist Voting
                </div>
            </div>
        ),
        { ...size }
    );
}
