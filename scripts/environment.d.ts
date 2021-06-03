declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOND: string;
      OWNER: string;
      REWARD_SOURCE: string;
      CV: string;
      STKAAVE: string;
      BB_ADAI: string;
      BB_AUSDT: string;
      BB_CRUSDC: string;
      BB_CRUSDC_WEEKLY_AMOUNT: string;
      BB_AUSDT_WEEKLY_AMOUNT: string;
      BB_ADAI_MULTI_RATE: string;
      BB_AUSDT_MULTI_RATE: string;
    }
  }
}

// convert file into a module by adding an empty export statement.
export {}
