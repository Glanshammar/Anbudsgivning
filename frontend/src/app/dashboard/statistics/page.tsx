export default function StatisticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Statistik</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-yellow-500">
          <h2 className="text-xl font-semibold mb-4">Pågående Upphandlingar</h2>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-green-600">
          <h2 className="text-xl font-semibold mb-4">
            Avslutade Upphandlingar
          </h2>
          <p className="text-3xl font-bold">8</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-blue-600">
          <h2 className="text-xl font-semibold mb-4">Vunna Upphandlingar</h2>
          <p className="text-3xl font-bold">5</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Totala Anbudsgivningar</h2>
          <p className="text-3xl font-bold">13</p>
        </div>
      </div>
    </div>
  );
}
