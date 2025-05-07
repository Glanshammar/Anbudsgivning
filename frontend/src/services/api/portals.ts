export const getPortals = async () => {
    const response = await fetch("http://localhost:5000/api/tender_portals", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error("Failed to fetch portals");
    }
    return Array.isArray(data.portals) ? data.portals : [];
}