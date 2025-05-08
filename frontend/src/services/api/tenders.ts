export interface Tender {
    project_name: string;
    branch: string;
    deadline: string;
    end_date: string;
    qualifications: number[];
    start_date: string; 
}

const USE_DUMMY = true;

const dummyTenders: Tender[] = [
        {
            project_name: "Projekt 1",
            branch: "Bygg & Anläggning",
            deadline: "2025-06-05",
            end_date: "2025-06-05",
            qualifications: [1, 4, 5],
            start_date: "2025-05-04",
        },
        {
            project_name: "Projekt 2",
            branch: "Energi",
            deadline: "2025-06-05",
            end_date: "2025-05-15",
            qualifications: [2, 3, 4],
            start_date: "2025-05-08",
        },
        {
            project_name: "Projekt 3",
            branch: "Fastighetsskötsel",
            deadline: "2025-06-05",
            end_date: "2025-05-25",
            qualifications: [1, 2, 3],
            start_date: "2025-05-20",
        }
];


export async function getTenders(): Promise<Tender[]> {
  if (USE_DUMMY) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(dummyTenders), 500)
    );
  } else {
    const response = await fetch("http://localhost:5000/api/tenders");
    if (!response.ok) {
      throw new Error("Failed to fetch tenders");
    }
    const data = await response.json();
    return (Object.values(data) as Tender[]).map((tender) => ({
      ...tender,
      qualifications: Object.values(tender.qualifications),
    }));
  }
}
