export default function StatisticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Statistik</h1>
      <div className="flex gap-6 scroll-horizontal">
        <div className="bg-white rounded-lg shadow p-6 text-yellow-500 flex-shrink-0 w-80">
          <h2 className="text-xl font-semibold mb-4">Pågående Upphandlingar</h2>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-green-600 flex-shrink-0 w-80">
          <h2 className="text-xl font-semibold mb-4">
            Avslutade Upphandlingar
          </h2>
          <p className="text-3xl font-bold">8</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-blue-600 flex-shrink-0 w-80">
          <h2 className="text-xl font-semibold mb-4">Vunna Upphandlingar</h2>
          <p className="text-3xl font-bold">5</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex-shrink-0 w-80">
          <h2 className="text-xl font-semibold mb-4">Totala Anbudsgivningar</h2>
          <p className="text-3xl font-bold">13</p>
        </div>
      </div>
    </div>
  );
}
