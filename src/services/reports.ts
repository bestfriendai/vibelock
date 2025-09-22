import supabase from "../config/supabase";
import { Report } from "../types";
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";

// Helper function to map database report to Report type
function mapDbReportToReport(dbReport: any): Report {
  const camelCase = mapFieldsToCamelCase(dbReport);
  return {
    ...camelCase,
    createdAt: new Date(camelCase.createdAt),
    reportedItemType: camelCase.reportedItemType as Report["reportedItemType"],
    reason: camelCase.reason as Report["reason"],
    status: camelCase.status as Report["status"],
  } as Report;
}

export class ReportsService {
  async createReport(report: Partial<Report>): Promise<Report> {
    return withRetry(async () => {
      // Convert Date to string for database
      const dbReport = {
        ...report,
        createdAt: report.createdAt ? report.createdAt.toISOString() : undefined,
      };
      const snakeCaseReport = mapFieldsToSnakeCase(dbReport);

      const { data, error } = await supabase
        .from("reports")
        .insert(snakeCaseReport as any)
        .select()
        .single();

      if (error) throw error;
      return mapDbReportToReport(data);
    });
  }

  async getReports(userId: string): Promise<Report[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapDbReportToReport);
    });
  }

  async updateReportStatus(reportId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from("reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reportId);

    if (error) throw error;
  }

  async getReportById(reportId: string): Promise<Report | null> {
    const { data, error } = await supabase.from("reports").select("*").eq("id", reportId).single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return mapDbReportToReport(data);
  }

  async getReportsByStatus(status: string, limit: number = 50): Promise<Report[]> {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapDbReportToReport);
  }

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);

    if (error) throw error;
  }
}

export const reportsService = new ReportsService();
