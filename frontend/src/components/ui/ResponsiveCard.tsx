import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResponsiveCardProps {
  title: string;
  branch: string;
  description: string;
  badgeText: string;
  details: { label: string; value: string | undefined }[];
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Reusable card component for displaying tender and bid information
 * Handles click delegation to prevent button clicks from triggering card clicks
 */
export const ResponsiveCard = ({
  title,
  branch,
  description,
  badgeText,
  details,
  children,
  onClick,
}: ResponsiveCardProps) => {
  /**
   * Handles card click events while preventing propagation from action buttons
   * Ensures buttons within the card can function independently
   */
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if user clicked on a button or its children
    if (
      (e.target as HTMLElement).tagName === "BUTTON" ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }
    onClick?.();
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow flex flex-col flex-grow p-4 ${
        onClick ? "cursor-pointer hover:border-blue-400" : ""
      }`}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{title}</CardTitle>
          <Badge variant="default">{badgeText}</Badge>
        </div>
        <CardDescription className="text-base">{branch}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          {/* Truncate long descriptions for consistent card heights */}
          <div className="text-base text-gray-600 mb-2">
            {description
              ? description.substring(0, 100) + "..."
              : "Ingen beskrivning tillgänglig"}
          </div>
          {details.map((detail, index) => (
            <div
              key={index}
              className={
                // Special layout for text content vs. key-value pairs
                detail.label === "Text"
                  ? "flex flex-col"
                  : "flex justify-between"
              }
            >
              <span className="text-base text-gray-600">{detail.label}:</span>
              <span
                className={`text-base font-medium ${
                  detail.label === "Text" ? "mt-1 whitespace-pre-wrap" : ""
                }`}
              >
                {detail.value}
              </span>
            </div>
          ))}
        </div>
        {/* Action buttons section - positioned at bottom */}
        <div className="mt-4 flex gap-2 flex-wrap">{children}</div>
      </CardContent>
    </Card>
  );
};
