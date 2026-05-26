/**
 * R365 OData API client.
 *
 * Handles authentication and queries against the Restaurant365 OData v2 API.
 * Base URL: https://odata.restaurant365.net/api/v2/views/
 *
 * Auth: Basic auth with credentials formatted as Domain\Username (where Domain
 * is the company subdomain from the R365 URL).
 */

const ODATA_BASE = "https://odata.restaurant365.net/api/v2/views";

export interface R365Config {
  /** Company subdomain — the part before .restaurant365.com */
  domain: string;
  /** R365 username */
  username: string;
  /** R365 password */
  password: string;
}

export type ODataView =
  | "Transaction"
  | "TransactionDetail"
  | "Company"
  | "Item"
  | "Location"
  | "GlAccount"
  | "Employee"
  | "JobTitle"
  | "LaborDetail"
  | "POSEmployee"
  | "SalesEmployee"
  | "SalesDetail"
  | "SalesPayment"
  | "EntityDeleted";

export interface ODataQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
}

export class R365Client {
  private authHeader: string;

  constructor(private config: R365Config) {
    // R365 OData requires credentials formatted as Domain\Username
    const credentials = `${config.domain}\\${config.username}`;
    this.authHeader =
      "Basic " + Buffer.from(`${credentials}:${config.password}`).toString("base64");
  }

  /**
   * Query an OData view with optional OData query parameters.
   */
  async query(view: ODataView, params?: ODataQueryParams): Promise<unknown> {
    const url = new URL(`${ODATA_BASE}/${view}`);

    if (params) {
      if (params.$filter) url.searchParams.set("$filter", params.$filter);
      if (params.$select) url.searchParams.set("$select", params.$select);
      if (params.$orderby) url.searchParams.set("$orderby", params.$orderby);
      if (params.$top !== undefined) url.searchParams.set("$top", String(params.$top));
      if (params.$skip !== undefined) url.searchParams.set("$skip", String(params.$skip));
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `R365 OData error (${response.status} ${response.statusText}): ${body}`
      );
    }

    return response.json();
  }

  /**
   * Fetch the OData metadata document (EDMX XML) describing all entity models.
   */
  async getMetadata(): Promise<string> {
    const response = await fetch(`${ODATA_BASE}/metadata`, {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `R365 metadata error (${response.status} ${response.statusText}): ${body}`
      );
    }

    return response.text();
  }
}
