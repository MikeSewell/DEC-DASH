declare module "intuit-oauth" {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: "sandbox" | "production";
    redirectUri: string;
  }

  interface TokenData {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    realmId?: string;
  }

  interface AuthResponse {
    getJson(): TokenData;
  }

  class OAuthClient {
    static scopes: {
      Accounting: string;
      OpenId: string;
      Payment: string;
    };

    constructor(config: OAuthClientConfig);
    authorizeUri(options: { scope: string[]; state?: string }): string;
    createToken(url: string): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;
    setToken(token: Partial<TokenData>): void;
  }

  export default OAuthClient;
}
