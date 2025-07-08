"use client";

import { useEffect, useState } from "react";
import { getTendersByState, TENDER_STATES } from "@/services/api/tenders";
import {
  getBidsByState,
  BID_STATES,
  getSubmittedBidsByYear,
  getAverageAuthoringTime,
  getMonthlyBidSubmissions,
  MonthlyBidSubmission,
} from "@/services/api/bids";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface StatisticsData {
  activeTenders: number;
  wonTenders: number;
  totalSubmittedBids: number;
  totalTenders: number;
  hitRate: number;
  bidRate: number;
  averageAuthoringTime: number;
  completionRate: number;
  authoringBids: number;
  submittedBids: number;
  wonLostBids: number;
  currentYear: number;
  bidSubmissionRate: number; // New: bids per month
  monthlySubmissions: MonthlyBidSubmission[]; // New: monthly data for chart
}

export default function StatisticsPage() {
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState<StatisticsData>({
    activeTenders: 0,
    wonTenders: 0,
    totalSubmittedBids: 0,
    totalTenders: 0,
    hitRate: 0,
    bidRate: 0,
    averageAuthoringTime: 0,
    completionRate: 0,
    authoringBids: 0,
    submittedBids: 0,
    wonLostBids: 0,
    currentYear: currentYear,
    bidSubmissionRate: 0, // New: bids per month
    monthlySubmissions: [], // New: monthly data for chart
  });
  const [loading, setLoading] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setLoading(true);

        // Fetch all tenders by state
        const [
          inboxTenders,
          underReviewTenders,
          preparingBidTenders,
          bidAuthoringTenders,
          submittedTenders,
        ] = await Promise.all([
          getTendersByState(TENDER_STATES.NYINKOMMET),
          getTendersByState(TENDER_STATES.UNDER_UTREDNING),
          getTendersByState(TENDER_STATES.SKA_BJUDAS_PA),
          getTendersByState(TENDER_STATES.BID_AUTHORING),
          getTendersByState(TENDER_STATES.SENT_BIDS),
        ]);

        // Fetch all bids by state and average authoring time
        const [
          notStartedBids,
          authoringBids,
          reviewingBids,
          submittedBids,
          ongoingDialogBids,
          wonLostBids,
          submittedBidsThisYear, // New: get submitted bids for current year
          averageAuthoringTime, // New: get average authoring time
          monthlySubmissions, // New: get monthly submission data
        ] = await Promise.all([
          getBidsByState(BID_STATES.NOT_STARTED),
          getBidsByState(BID_STATES.AUTHORING),
          getBidsByState(BID_STATES.REVIEWING),
          getBidsByState(BID_STATES.SUBMITTED),
          getBidsByState(BID_STATES.ONGOING_DIALOG),
          getBidsByState(BID_STATES.WON_LOST),
          getSubmittedBidsByYear(currentYear), // New: fetch submitted bids for current year
          getAverageAuthoringTime(), // New: fetch average authoring time
          getMonthlyBidSubmissions(), // New: fetch monthly submission data
        ]);

        // Calculate basic counts
        const activeTenders =
          inboxTenders.length +
          underReviewTenders.length +
          preparingBidTenders.length +
          bidAuthoringTenders.length;

        const totalTenders =
          inboxTenders.length +
          underReviewTenders.length +
          preparingBidTenders.length +
          bidAuthoringTenders.length +
          submittedTenders.length;

        const wonTenders = wonLostBids.length;

        const totalBids =
          notStartedBids.length +
          authoringBids.length +
          reviewingBids.length +
          submittedBids.length +
          ongoingDialogBids.length +
          wonLostBids.length;

        // Use submitted bids for current year instead of total bids
        const totalSubmittedBids = submittedBidsThisYear.length;

        // Calculate bid submission rate (bids per month)
        const totalSubmittedLast12Months = monthlySubmissions.reduce(
          (sum, month) => sum + month.count,
          0
        );
        const bidSubmissionRate = totalSubmittedLast12Months / 12;

        // Calculate advanced statistics
        const submittedAndWonBids =
          submittedBids.length + ongoingDialogBids.length + wonLostBids.length;
        const hitRate =
          submittedAndWonBids > 0
            ? (wonLostBids.length / submittedAndWonBids) * 100
            : 0;

        const bidRate = totalTenders > 0 ? (totalBids / totalTenders) * 100 : 0;

        const completedBids =
          reviewingBids.length +
          submittedBids.length +
          ongoingDialogBids.length +
          wonLostBids.length;
        const completionRate =
          totalBids > 0 ? (completedBids / totalBids) * 100 : 0;

        setStats({
          activeTenders,
          wonTenders,
          totalSubmittedBids, // Updated to use year-filtered submitted bids
          totalTenders,
          hitRate: Math.round(hitRate * 10) / 10,
          bidRate: Math.round(bidRate * 10) / 10,
          averageAuthoringTime: Math.round(averageAuthoringTime * 10) / 10, // Use fetched average authoring time
          completionRate: Math.round(completionRate * 10) / 10,
          authoringBids: authoringBids.length,
          submittedBids: submittedBids.length,
          wonLostBids: wonLostBids.length,
          currentYear: currentYear,
          bidSubmissionRate: Math.round(bidSubmissionRate * 10) / 10, // New: average bids per month
          monthlySubmissions: monthlySubmissions, // New: monthly data for chart
        });
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, [currentYear]);

  const handleShare = (method: string) => {
    const statsText = `Bid Management Statistics

Bid Submission Rate: ${stats.bidSubmissionRate} bids/mth
Active Tenders: ${stats.activeTenders}
Won Tenders: ${stats.wonTenders}
Total Bids Submitted (${stats.currentYear}): ${stats.totalSubmittedBids}

Performance Metrics:
• Hit Ratio: ${stats.hitRate}%
• Qualifying Tenders: ${stats.bidRate}%
• Average Bid Authoring Time: ${stats.averageAuthoringTime} days
• Bid Completion Ratio (Yearly): ${stats.completionRate}%

Generated on ${new Date().toLocaleDateString()}`;

    switch (method) {
      case "copy":
        navigator.clipboard.writeText(statsText);
        alert("Statistics copied to clipboard!");
        break;
      case "email":
        const emailSubject = encodeURIComponent("Bid Management Statistics");
        const emailBody = encodeURIComponent(statsText);
        window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`);
        break;
      case "download":
        const blob = new Blob([statsText], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bid-statistics-${
          new Date().toISOString().split("T")[0]
        }.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        break;
      case "native":
        if (navigator.share) {
          navigator.share({
            title: "Bid Management Statistics",
            text: statsText,
          });
        } else {
          alert("Native sharing not supported on this device");
        }
        break;
    }
    setShareMenuOpen(false);
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Statistics</h1>
          <div className="bg-gray-300 rounded px-4 py-2 w-20 h-10 animate-pulse"></div>
        </div>

        {/* Loading state for highlighted card */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <div className="h-8 bg-green-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-green-200 rounded w-3/4 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center">
                  <div className="h-12 bg-green-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-green-200 rounded w-2/3 animate-pulse"></div>
                </div>
                <div className="h-64 bg-green-200 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-300 rounded mb-4"></div>
              <div className="h-8 bg-gray-300 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <div className="relative">
          <button
            onClick={() => setShareMenuOpen(!shareMenuOpen)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Share
          </button>
          {shareMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
              <button
                onClick={() => handleShare("copy")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => handleShare("email")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Share via Email
              </button>
              <button
                onClick={() => handleShare("download")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Download Report
              </button>
              <button
                onClick={() => handleShare("native")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg"
              >
                Native Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Highlighted Bid Submission Rate Card */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-green-800">
              Bid Submission Rate
            </CardTitle>
            <CardDescription className="text-green-700">
              Average submissions over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rate Display */}
              <div className="flex flex-col justify-center">
                <div className="text-4xl font-bold text-green-800 mb-2">
                  {stats.bidSubmissionRate}{" "}
                  <span className="text-2xl">bids/mth</span>
                </div>
                <div className="text-sm text-green-600">
                  Based on{" "}
                  {stats.monthlySubmissions.reduce(
                    (sum, month) => sum + month.count,
                    0
                  )}{" "}
                  submissions in the last 12 months
                </div>
              </div>

              {/* Chart */}
              <div className="h-80">
                <ChartContainer
                  config={
                    {
                      count: {
                        label: "Submissions",
                        color: "hsl(142, 76%, 36%)",
                      },
                    } satisfies ChartConfig
                  }
                  className="h-full"
                >
                  <BarChart
                    data={stats.monthlySubmissions}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(142, 50%, 80%)"
                    />
                    <XAxis
                      dataKey="monthName"
                      tick={{ fontSize: 10, fill: "hsl(142, 50%, 30%)" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tickMargin={10}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(142, 50%, 30%)" }}
                      allowDecimals={false}
                      domain={[0, "dataMax"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="hsl(142, 76%, 36%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Basic Counts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Active Tenders
          </h2>
          <p className="text-3xl font-bold text-black">{stats.activeTenders}</p>
          <p className="text-sm text-gray-600 mt-2">
            Currently being processed
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Won Tenders</h2>
          <p className="text-3xl font-bold text-black">{stats.wonTenders}</p>
          <p className="text-sm text-gray-600 mt-2">Successfully completed</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Total Bids Submitted ({stats.currentYear})
          </h2>
          <p className="text-3xl font-bold text-black">
            {stats.totalSubmittedBids}
          </p>
          <p className="text-sm text-gray-600 mt-2">Submitted this year</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Total Tenders
          </h2>
          <p className="text-3xl font-bold text-black">{stats.totalTenders}</p>
          <p className="text-sm text-gray-600 mt-2">All opportunities</p>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Hit Ratio</h2>
          <p className="text-3xl font-bold text-black">{stats.hitRate}%</p>
          <p className="text-sm text-gray-600 mt-2">
            Won bids / Submitted bids
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Qualifying Tenders
          </h2>
          <p className="text-3xl font-bold text-black">{stats.bidRate}%</p>
          <p className="text-sm text-gray-600 mt-2">Bids created / Tenders</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Average Bid Authoring Time
          </h2>
          <p className="text-3xl font-bold text-black">
            {stats.averageAuthoringTime} days
          </p>
          <p className="text-sm text-gray-600 mt-2">
            From authoring to submission
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">
            Bid Completion Ratio (Yearly)
          </h2>
          <p className="text-3xl font-bold text-black">
            {stats.completionRate}%
          </p>
          <p className="text-sm text-gray-600 mt-2">Completed / Total bids</p>
        </div>
      </div>

      {/* Click outside to close share menu */}
      {shareMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShareMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}
