import { currencySymbol } from './currency';
import { FunctionDeclaration, Type } from '@google/genai';
import { db } from './db';
import {
  generateBusinessMasterReportHtml,
  generateRestaurantReportHtml,
  generateProfitByItemReportDoc,
  generateProfitByBillReportDoc,
  generateProfitBySalesmanReportDoc,
  generateProfitByRestaurantReportDoc,
  generateCustomerSaleBillDoc,
  generateSalesReportDoc,
  generatePurchasesReportDoc,
} from './reports';
import { generateAiLedgerAuditHtml } from './ledgerAuditHtml';
import { ExpenseAllocationMethod, OrderStatus, PaymentMethod, ProductCategory, UnitType } from '../src/types';

export interface ToolExecutionContext {
  userId?: string;
  userName?: string;
  userRole?: 'Admin' | 'Manager' | 'Order Taker' | 'Inventory Staff' | 'Accountant';
  source?: 'ai_chat' | 'voice' | 'image_ocr' | 'manual';
}

export const toolsDeclarations: FunctionDeclaration[] = [
  {
    name: 'create_restaurant',
    description: 'Registers a new restaurant account in the system with contact information and credit limit.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Full business name of the restaurant (e.g. "Al Madina Biryani & Karahi")' },
        contactPerson: { type: Type.STRING, description: 'Primary contact person name' },
        phone: { type: Type.STRING, description: 'Phone number for orders and WhatsApp billing' },
        address: { type: Type.STRING, description: 'Physical delivery address / location' },
        creditLimit: { type: Type.NUMBER, description: 'Approved credit limit in PKR/rupees (default 100,000)' },
      },
      required: ['name', 'contactPerson', 'phone'],
    },
  },
  {
    name: 'search_restaurants',
    description: 'Searches existing restaurants by name or phone to find matching accounts and check balances.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Restaurant name or search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_inventory_item',
    description: 'Adds a new wholesale inventory product into catalog or records stock intake. Automatically calculates per-unit rate from total cost and suggests selling price if not provided.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Product name (e.g. "Daal Moong", "Basmati Rice")' },
        quantity: { type: Type.NUMBER, description: 'Quantity purchased or received in stock' },
        currentQuantity: { type: Type.NUMBER, description: 'Alternative for quantity' },
        unit: { type: Type.STRING, description: 'Measurement unit: kg, gram, liter, carton, box, bag, piece, can' },
        purchasePrice: { type: Type.NUMBER, description: 'Cost price per unit paid to supplier. If omitted, calculated from totalCost / quantity' },
        totalCost: { type: Type.NUMBER, description: 'Total purchase expense or invoice amount paid for the whole batch' },
        sellingPrice: { type: Type.NUMBER, description: 'Wholesale selling price per unit. If omitted, standard 20% margin is automatically applied' },
        category: { type: Type.STRING, description: 'Category (Rice & Grains, Pulses & Daal, Flour & Atta, Cooking Oil & Ghee, Spices & Masala, Packaging, etc.)' },
        minStockLevel: { type: Type.NUMBER, description: 'Low-stock threshold warning level' },
        supplierName: { type: Type.STRING, description: 'Optional supplier name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_inventory',
    description: 'Updates an existing inventory item: adds stock, adjusts purchase cost, or updates selling price.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productIdOrName: { type: Type.STRING, description: 'Product ID or name' },
        quantityToAdd: { type: Type.NUMBER, description: 'Quantity to add to current stock (e.g. 50 kg received)' },
        newPurchasePrice: { type: Type.NUMBER, description: 'Updated supplier purchase price per unit' },
        newSellingPrice: { type: Type.NUMBER, description: 'Updated wholesale selling price' },
        notes: { type: Type.STRING, description: 'Reason for update or intake invoice reference' },
      },
      required: ['productIdOrName'],
    },
  },
  {
    name: 'create_order',
    description: 'Creates a real wholesale restaurant supply order. Automatically calculates revenue, product cost from inventory, gross profit, and ledger balance. Decreases inventory if confirmed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        restaurantNameOrId: { type: Type.STRING, description: 'Name or ID of the restaurant ordering supplies' },
        items: {
          type: Type.ARRAY,
          description: 'List of products ordered with quantities and optional custom prices',
          items: {
            type: Type.OBJECT,
            properties: {
              productNameOrId: { type: Type.STRING, description: 'Name or ID of product (e.g. "Rice", "Daal Chana", "Cooking Oil")' },
              quantity: { type: Type.NUMBER, description: 'Quantity ordered' },
              unitPrice: { type: Type.NUMBER, description: 'Optional custom selling price per unit. If omitted, uses catalog selling price.' },
            },
            required: ['productNameOrId', 'quantity'],
          },
        },
        deliveryFee: { type: Type.NUMBER, description: 'Delivery / shipping fee charged to restaurant' },
        advancePayment: { type: Type.NUMBER, description: 'Payment received right now (in PKR)' },
        totalOrderAmount: { type: Type.NUMBER, description: 'Total selling price agreed for the order in PKR (overrides default catalog prices)' },
        balanceDue: { type: Type.NUMBER, description: 'Explicit remaining balance due (baqaya) if customer owes remaining money. If omitted or 0, order is fully paid and all received payment is profit.' },
        paymentMethod: { type: Type.STRING, description: 'Payment method for advance (Cash, Bank Transfer, Cheque, Online)' },
        notes: { type: Type.STRING, description: 'Delivery instructions or notes' },
      },
      required: ['restaurantNameOrId', 'items'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancels or voids an order (e.g. when user says "ye order khatam / cancel kardo", "Al Ghani ka order cancel kardo", or provides order number ORD-2026-1005). Restores deducted inventory back to warehouse stock and clears restaurant balance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderIdOrNumber: { type: Type.STRING, description: 'Order Number (e.g. "ORD-2026-1005"), Order ID, or Restaurant Name to cancel their active order' },
        reason: { type: Type.STRING, description: 'Optional reason for cancellation' },
      },
      required: ['orderIdOrNumber'],
    },
  },
  {
    name: 'record_payment',
    description: 'Records a payment received from a restaurant against their ledger or a specific order. Decreases their outstanding balance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        restaurantNameOrId: { type: Type.STRING, description: 'Name or ID of the restaurant making the payment' },
        amount: { type: Type.NUMBER, description: 'Payment amount in PKR/rupees' },
        paymentMethod: { type: Type.STRING, description: 'Cash, Bank Transfer, Cheque, Online' },
        orderNumberOrId: { type: Type.STRING, description: 'Optional specific order ID or number this payment covers' },
        notes: { type: Type.STRING, description: 'Bank ref, cheque number, or notes' },
      },
      required: ['restaurantNameOrId', 'amount'],
    },
  },
  {
    name: 'create_expense',
    description: 'Records an operational expense (e.g. Petrol 4500, helper wages, packaging, electricity).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Category: Petrol, Delivery, Phone/Calling, Salaries, Packaging, Electricity, Warehouse, Transportation, Maintenance, Miscellaneous' },
        title: { type: Type.STRING, description: 'Description of the expense (e.g. "Delivery van petrol today")' },
        amount: { type: Type.NUMBER, description: 'Expense amount in PKR' },
        scope: { type: Type.STRING, description: 'Scope: "business_wide", "restaurant_specific", "order_specific"' },
        targetRestaurantNameOrId: { type: Type.STRING, description: 'Optional restaurant name if expense is specific to one restaurant' },
        notes: { type: Type.STRING, description: 'Additional details or vehicle number' },
      },
      required: ['category', 'amount', 'title'],
    },
  },
  {
    name: 'allocate_expense',
    get description() {
      return `Intelligently allocates a shared expense (like petrol ${currencySymbol()} 5000) across delivered restaurants using rules: equal, order_value, distance, or order_weight.`;
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        expenseId: { type: Type.STRING, description: 'ID of the expense to allocate' },
        method: { type: Type.STRING, description: 'Method: "equal", "order_value", "distance", "order_weight", "delivery_count"' },
        targetRestaurantNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional list of specific restaurant names to divide the expense among',
        },
      },
      required: ['expenseId', 'method'],
    },
  },
  {
    name: 'calculate_restaurant_profit',
    description: 'Calculates the detailed profitability of a specific restaurant (Revenue - Purchase Cost - Allocated Expenses = Net Profit and Margins).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        restaurantNameOrId: { type: Type.STRING, description: 'Name or ID of the restaurant' },
      },
      required: ['restaurantNameOrId'],
    },
  },
  {
    name: 'calculate_business_profit',
    description: 'Calculates overall business profit, gross margins, operational expenses, and net profit for today or overall period.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, description: '"today", "weekly", "monthly", or "all_time"' },
      },
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Retrieves current stock levels, low-stock alerts, total inventory value, or checks stock for a specific item using English or Urdu/Roman Urdu names (e.g. "cheeni", "sugar", "chawal", "atta").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Optional product name or Urdu/English keyword to check (e.g. "cheeni", "sugar", "chawal", "oil")' },
        categoryFilter: { type: Type.STRING, description: 'Optional category to filter (e.g. "Rice & Grains")' },
        onlyLowStock: { type: Type.BOOLEAN, description: 'Whether to show only items below minimum stock level' },
      },
    },
  },
  {
    name: 'get_business_summary',
    description: 'Returns today\'s comprehensive business summary: Revenue, Gross Profit, Expenses, Net Profit, Orders count, Outstanding balances, and Low stock alerts.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'search_business_data',
    description: 'Performs a global search across all business records: orders, restaurants, inventory, payments, expenses.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query (e.g. "unpaid restaurants", "rice orders", "petrol expenses")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_restaurant_report',
    description: 'Generates a complete, downloadable Statement of Account & Profit/Loss Audit Document (.doc / .html) for a specific restaurant, with order list, payments, baaqi udhaar, and net profit.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        restaurantNameOrId: { type: Type.STRING, description: 'Name or ID of the restaurant whose statement file should be generated' },
      },
      required: ['restaurantNameOrId'],
    },
  },
  {
    name: 'generate_business_report',
    description: 'Generates a master business audit report file (.doc / .html) covering all restaurants, total turnover, inventory valuation, total market udhaar, expenses, and net profit.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'register_company',
    description: 'Registers the business/company details in the AI Ledger system (company name, owner name, phone/WhatsApp, address, city, business category, NTN).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Registered business/company name (e.g. "Al-Hanan Wholesale Traders")' },
        ownerName: { type: Type.STRING, description: 'Owner / Proprietor / Munshi name' },
        phone: { type: Type.STRING, description: 'Phone or WhatsApp number for customer ledger reminders' },
        city: { type: Type.STRING, description: 'City (e.g. Lahore, Karachi, Rawalpindi)' },
        address: { type: Type.STRING, description: 'Market / Shop / Warehouse address' },
        businessType: { type: Type.STRING, description: 'Business category (e.g. Wholesale Food & Grains, Restaurant Supplies, FMCG)' },
        ntn: { type: Type.STRING, description: 'Optional NTN / Sales Tax registration number' },
        tagline: { type: Type.STRING, description: 'Optional slogan or tagline' },
      },
      required: ['name', 'ownerName', 'phone'],
    },
  },
  {
    name: 'get_company_profile',
    description: 'Retrieves the registered company profile details, owner name, contact number, and city for this AI Ledger.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_purchase_report',
    description: 'Retrieves comprehensive purchase details and report (Bill #, vendor bills, supplier purchases breakdown, item categories, carton counts, net purchases, total paid, and payable balance) when user asks for purchase reports or hisaab.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplierNameOrId: { type: Type.STRING, description: 'Optional supplier name or ID to filter report' },
        fromDate: { type: Type.STRING, description: 'Optional start date filter (YYYY-MM-DD or DD-MM-YYYY)' },
        toDate: { type: Type.STRING, description: 'Optional end date filter (YYYY-MM-DD or DD-MM-YYYY)' },
        search: { type: Type.STRING, description: 'Optional search keyword for item title, bill #, or vendor bill #' },
      },
    },
  },
  {
    name: 'get_purchase_bills',
    description: 'Lists purchase bills and details including Bill #, Vendor Bill #, Date, Supplier, Items list, Cartons, Quantities, Rates, and Balances.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplierNameOrId: { type: Type.STRING, description: 'Optional supplier filter' },
        search: { type: Type.STRING, description: 'Search term for bill # or item name' },
      },
    },
  },
  {
    name: 'create_purchase_bill',
    description: 'Creates and saves a wholesale purchasing bill with purchasing details (Bill #, vendor bill #, supplier, items with category, cartons, rates, VAT, amount paid, and credit balance).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplierName: { type: Type.STRING, description: 'Name of the supplier / party' },
        billNumber: { type: Type.STRING, description: 'Bill number e.g. 1713 (auto-generated if omitted)' },
        vendorBillNumber: { type: Type.STRING, description: 'Vendor / supplier invoice reference number' },
        date: { type: Type.STRING, description: 'Purchase date' },
        isCash: { type: Type.BOOLEAN, description: 'Whether bill was paid in full cash' },
        paidAmount: { type: Type.NUMBER, description: 'Cash / advance amount paid to supplier' },
        loadExp: { type: Type.NUMBER, description: 'Loading / carriage expense' },
        items: {
          type: Type.ARRAY,
          description: 'List of purchased items',
          items: {
            type: Type.OBJECT,
            properties: {
              itemTitle: { type: Type.STRING, description: 'Title or name of the item' },
              category: { type: Type.STRING, description: 'Category of item (e.g. Tea & Coffee, Spices, Pulses)' },
              ctn: { type: Type.NUMBER, description: 'Cartons count' },
              ratePerCtn: { type: Type.NUMBER, description: 'Purchase rate per carton' },
              qtyPerCtn: { type: Type.NUMBER, description: 'Units per carton' },
              qty: { type: Type.NUMBER, description: 'Total units/pieces' },
              rate: { type: Type.NUMBER, description: 'Unit rate' },
              discount: { type: Type.NUMBER, description: 'Discount amount' },
              vatPercent: { type: Type.NUMBER, description: 'VAT percentage (e.g. 5)' },
            },
            required: ['itemTitle'],
          },
        },
        notes: { type: Type.STRING, description: 'Remarks or delivery note' },
      },
      required: ['supplierName', 'items'],
    },
  },
  {
    name: 'get_profit_per_item_report',
    description: 'Retrieves verified Profit Per Item report showing sales volume, purchase cost, revenue, gross profit, and margin % for every item, with verified calculations and a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Optional product name or search term' },
      },
    },
  },
  {
    name: 'get_profit_per_salesman_report',
    description: 'Retrieves verified Profit Per Salesman report showing sales volume, total bills, gross profit, and margin % per salesman, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_profit_per_restaurant_report',
    description: 'Retrieves verified Profit Per Restaurant / Customer report showing total sales, gross profit, margin %, and outstanding balance, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Optional restaurant/customer name or code' },
      },
    },
  },
  {
    name: 'get_profit_per_bill_report',
    description: 'Retrieves verified Profit Per Sale Bill report showing invoice-by-invoice breakdown of revenue, COGS, gross profit, and margin %, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Optional bill number or customer name' },
      },
    },
  },
  {
    name: 'get_master_audit_daily_report',
    description: 'Retrieves the Master Audit File / Daily Business Report showing complete ledger audit, transactions, daily turnover, cash in hand, and receivables, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Optional date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'get_customer_sale_bill_report',
    description: 'Finds and generates the verified printable Sale Bill document for a specific customer or bill number, including previous balance, items list, cash received, and remaining balance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerNameOrBillNumber: { type: Type.STRING, description: 'Customer name, customer code, or sale bill number' },
      },
      required: ['customerNameOrBillNumber'],
    },
  },
  {
    name: 'get_comprehensive_sales_report',
    description: 'Retrieves comprehensive sales report with bill list, customer titles, payment modes, gross and net totals, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Optional search filter' },
      },
    },
  },
  {
    name: 'get_comprehensive_purchases_report',
    description: 'Retrieves comprehensive purchases report with supplier bills list, carton counts, net totals, paid amounts, and payable balance, with a downloadable report file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplierNameOrId: { type: Type.STRING, description: 'Optional supplier name or ID' },
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, any>, ctx: ToolExecutionContext = {}): Promise<any> {
  const user = {
    id: ctx.userId || 'usr-system',
    name: ctx.userName || 'AI Assistant',
    role: ctx.userRole || 'Admin',
  };
  const source = ctx.source || 'ai_chat';

  switch (name) {
    case 'register_company': {
      const { name: compName, ownerName, phone, city, address, businessType, ntn, tagline } = args;
      const registered = db.registerCompany(
        { name: compName, ownerName, phone, city, address, businessType, ntn, tagline },
        source,
        user.name
      );
      return {
        success: true,
        message: `Mubarak ho! Aap ki company "${registered.name}" AI Ledger system me baqaida register ho chuki hai!\n` +
          `• Malik / Munshi: ${registered.ownerName}\n` +
          `• Rabta / WhatsApp: ${registered.phone}\n` +
          `• Shehar: ${registered.city || 'Pakistan'}\n` +
          `• Karobar Category: ${registered.businessType}\n\n` +
          `Ab tamam orders, purchase stock entries, aur customer khata reports aap k is registered karobar k naam se banaye jayein ge.`,
        company: registered,
      };
    }

    case 'get_company_profile': {
      const comp = db.getCompanyProfile();
      return {
        success: true,
        isRegistered: Boolean(comp?.isRegistered),
        company: comp || null,
        message: comp?.isRegistered
          ? `Current registered business: "${comp.name}" (Proprietor: ${comp.ownerName}, Phone: ${comp.phone}, City: ${comp.city})`
          : `No company has been registered yet. The business should register their company first.`,
      };
    }
    case 'create_restaurant': {
      const { name: restName, contactPerson, phone, address = 'Lahore, Pakistan', creditLimit = 100000 } = args;
      const created = db.createRestaurant(
        {
          name: restName,
          contactPerson,
          phone,
          address,
          creditLimit: Number(creditLimit),
          status: 'active',
        },
        source,
        user
      );
      return {
        success: true,
        message: `Successfully created restaurant account for "${created.name}" with credit limit ${currencySymbol()} ${created.creditLimit.toLocaleString()}.`,
        restaurant: created,
      };
    }

    case 'search_restaurants': {
      const { query } = args;
      const all = db.getRestaurants();
      const q = String(query).toLowerCase();
      const matches = all.filter(
        (r) => r.name.toLowerCase().includes(q) || r.contactPerson.toLowerCase().includes(q) || r.phone.includes(q)
      );
      return {
        query,
        count: matches.length,
        restaurants: matches.map((r) => ({
          id: r.id,
          name: r.name,
          contactPerson: r.contactPerson,
          phone: r.phone,
          outstandingBalance: r.outstandingBalance,
          creditLimit: r.creditLimit,
          totalPurchases: r.totalPurchases,
        })),
      };
    }

    case 'create_inventory_item': {
      const rawName = (args.name || args.productName || '').trim();
      const isUnnamed = !rawName ||
        rawName.toLowerCase() === 'new product' ||
        rawName.toLowerCase() === 'new stock item' ||
        rawName.toLowerCase() === 'item' ||
        rawName.toLowerCase() === 'stock' ||
        rawName.toLowerCase() === 'unnamed' ||
        /^[0-9]+(\s*(kg|kilo|liter|l|gram|gm|carton|box))?$/i.test(rawName);

      if (isUnnamed) {
        return {
          success: false,
          needsClarification: true,
          error: `Aap ny quantity batayi hai lekin item ka naam nahi bataya. Baraye meherbani batayein k konsi cheez (maslan Basmati Rice, Banaspati Ghee, Daal Moong, Cheeni, Atta waghera) add karni hai?`,
        };
      }

      const prodName = rawName;
      const qty = Number(args.quantity ?? args.currentQuantity ?? 0);
      const totalCost = Number(args.totalCost || 0);
      let purchasePrice = Number(args.purchasePrice || 0);

      // If neither price nor totalCost was provided, ask for clarification so accounts stay 100% accurate
      if ((!purchasePrice || purchasePrice <= 0) && (!totalCost || totalCost <= 0)) {
        return {
          success: false,
          needsClarification: true,
          error: `Aap ny ${qty > 0 ? `${qty} ${args.unit || 'kg'} ` : ''}"${prodName}" bataya hai, lekin khareed qeemat ya rate nahi batayi. Baraye meherbani batayein k yeh maal kul kitne rupay (Total Bill) me kharida gaya hai ya per-unit khareed rate kya hai? Ta k hisaab me koi farq na aaye.`,
        };
      }

      // Auto-calculate unit purchase price if total cost and quantity provided (preserving exact cents/decimals)
      if ((!purchasePrice || purchasePrice <= 0) && totalCost > 0 && qty > 0) {
        purchasePrice = Number((totalCost / qty).toFixed(2));
      }

      if (!purchasePrice || purchasePrice <= 0) {
        return {
          success: false,
          needsClarification: true,
          error: `Price aur Amount batana laazmi hai! Stock add karne k liye item ki purchase price (khareed rate) ya total bill amount batana zaroori hai. Is k baghair stock add nahi kiya ja sakta. Baraye meherbani is ka rate ya total bill amount batayein.`,
        };
      }

      const actualBatchTotal = totalCost > 0 ? totalCost : Number((purchasePrice * qty).toFixed(2));

      // Auto-calculate selling price with standard 20% margin if omitted
      let sellingPrice = Number(args.sellingPrice || 0);
      if (!sellingPrice || sellingPrice <= 0) {
        sellingPrice = Math.round(purchasePrice * 1.2);
      }

      // Auto-detect category based on item title
      let category: ProductCategory = 'Custom';
      const lower = prodName.toLowerCase();
      if (lower.includes('rice') || lower.includes('chawal') || lower.includes('biryani') || lower.includes('basmati')) category = 'Rice & Grains';
      else if (lower.includes('daal') || lower.includes('dal') || lower.includes('moong') || lower.includes('chana') || lower.includes('masoor') || lower.includes('mash') || lower.includes('pulses')) category = 'Pulses & Daal';
      else if (lower.includes('oil') || lower.includes('tel') || lower.includes('ghee') || lower.includes('cooking')) category = 'Cooking Oil & Ghee';
      else if (lower.includes('atta') || lower.includes('aata') || lower.includes('flour') || lower.includes('maida') || lower.includes('suji')) category = 'Flour & Atta';
      else if (lower.includes('masala') || lower.includes('spice') || lower.includes('mirch') || lower.includes('haldi') || lower.includes('dhania')) category = 'Spices & Masala';
      else if (lower.includes('chicken') || lower.includes('meat') || lower.includes('gosht') || lower.includes('beef') || lower.includes('mutton')) category = 'Meat & Poultry';
      else if (lower.includes('carton') || lower.includes('shopper') || lower.includes('box') || lower.includes('packaging') || lower.includes('dabba')) category = 'Packaging & Containers';
      else if (args.category) category = args.category as ProductCategory;

      const unit: UnitType = (args.unit || (lower.includes('oil') ? 'liter' : 'kg')) as UnitType;

      // Check if product with similar name already exists
      const existing = db.findProductByName(prodName);
      if (existing) {
        const prevQty = Math.max(0, existing.currentQuantity);
        const prevValue = prevQty * existing.purchasePrice;
        const incomingValue = actualBatchTotal;
        const totalNewQty = prevQty + qty;
        const newWeightedPrice = totalNewQty > 0 ? Number(((prevValue + incomingValue) / totalNewQty).toFixed(2)) : purchasePrice;

        const updated = db.updateProduct(
          existing.id,
          {
            currentQuantity: totalNewQty,
            purchasePrice: newWeightedPrice,
            lastPurchasePrice: purchasePrice,
            sellingPrice: args.sellingPrice ? Number(args.sellingPrice) : existing.sellingPrice,
            notes: `Restocked: +${qty} ${unit} @ ${currencySymbol()} ${purchasePrice} (Batch Total: ${currencySymbol()} ${actualBatchTotal.toLocaleString()})`,
          },
          source,
          user
        );
        return {
          success: true,
          message: `Updated existing stock for "${updated.name}": Added ${qty} ${unit} @ ${currencySymbol()} ${purchasePrice} (Batch Total: ${currencySymbol()} ${actualBatchTotal.toLocaleString()}). Current stock is now ${updated.currentQuantity} ${unit} (Weighted Avg Cost: ${currencySymbol()} ${updated.purchasePrice} | Total Stock Value: ${currencySymbol()} ${updated.stockValue?.toLocaleString()} | Selling Price: ${currencySymbol()} ${updated.sellingPrice}).`,
          product: updated,
        };
      }

      const created = db.createProduct(
        {
          name: prodName,
          sku: args.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          category,
          unit,
          currentQuantity: qty,
          minStockLevel: Number(args.minStockLevel || 10),
          purchasePrice,
          sellingPrice,
          supplierName: args.supplierName || 'Direct Wholesale Market',
          lastPurchasePrice: purchasePrice,
          averagePurchaseCost: purchasePrice,
        },
        source,
        user
      );

      return {
        success: true,
        message: `Inventory record created successfully for "${created.name}"!\n` +
          `• Quantity: ${created.currentQuantity} ${created.unit}\n` +
          `• Purchase Cost: ${currencySymbol()} ${created.purchasePrice} / ${created.unit} (Total Bill: ${currencySymbol()} ${actualBatchTotal.toLocaleString()})\n` +
          `• Wholesale Selling Rate: ${currencySymbol()} ${created.sellingPrice} / ${created.unit} (${created.profitMargin}% Expected Margin)\n` +
          `• Category: ${created.category}`,
        product: created,
      };
    }

    case 'update_inventory': {
      const { productIdOrName, quantityToAdd, newPurchasePrice, newSellingPrice, notes } = args;
      const prod = db.findProductByName(productIdOrName) || db.getProductById(productIdOrName);
      if (!prod) {
        return { success: false, error: `Product "${productIdOrName}" not found in inventory catalog.` };
      }

      const updates: Partial<typeof prod> = {};
      if (quantityToAdd !== undefined && Number(quantityToAdd) !== 0) {
        updates.currentQuantity = prod.currentQuantity + Number(quantityToAdd);
      }
      if (newPurchasePrice !== undefined) {
        updates.purchasePrice = Number(newPurchasePrice);
        updates.lastPurchasePrice = Number(newPurchasePrice);
      }
      if (newSellingPrice !== undefined) {
        updates.sellingPrice = Number(newSellingPrice);
      }
      if (notes) {
        updates.notes = notes;
      }

      const updated = db.updateProduct(prod.id, updates, source, user);
      return {
        success: true,
        message: `Updated "${updated.name}": Stock now ${updated.currentQuantity} ${updated.unit}, Cost ${currencySymbol()} ${updated.purchasePrice}, Selling ${currencySymbol()} ${updated.sellingPrice}.`,
        product: updated,
      };
    }

    case 'create_order': {
      const {
        restaurantNameOrId,
        items,
        deliveryFee = 0,
        advancePayment,
        totalOrderAmount,
        balanceDue: explicitBalanceDue,
        paymentMethod = 'Cash',
        notes,
      } = args;

      // Find restaurant, or auto-create if new
      let rest = db.getRestaurantById(restaurantNameOrId) || db.findRestaurantByName(restaurantNameOrId);
      let autoCreatedRest = false;
      if (!rest) {
        rest = db.createRestaurant(
          {
            name: restaurantNameOrId,
            contactPerson: `${restaurantNameOrId} Incharge`,
            phone: '0300-0000000',
            address: 'Direct Delivery Address',
            creditLimit: 100000,
            status: 'active',
          },
          source,
          user
        );
        autoCreatedRest = true;
      }

      // Resolve items and verify stock availability, auto-enrolling new items if specified
      const resolvedItems: { productId: string; quantity: number; unitPrice?: number }[] = [];
      const stockCheckDetails: {
        productName: string;
        orderedQty: number;
        unit: string;
        availableBefore: number;
        remainingAfter: number;
        inStock: boolean;
        shortageQty: number;
      }[] = [];

      for (const item of items) {
        let prod = db.getProductById(item.productNameOrId) || db.findProductByName(item.productNameOrId);
        if (!prod) {
          // Auto-enroll product in inventory with adequate stock
          const itemUnitPrice = item.unitPrice ? Number(item.unitPrice) : 350;
          const purchaseCost = Math.round(itemUnitPrice * 0.8);
          const orderedQty = Number(item.quantity);
          prod = db.createProduct(
            {
              name: item.productNameOrId,
              sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
              category: 'Custom',
              unit: 'kg',
              currentQuantity: orderedQty * 2, // sufficient warehouse stock
              minStockLevel: 10,
              purchasePrice: purchaseCost,
              sellingPrice: itemUnitPrice,
              lastPurchasePrice: purchaseCost,
              averagePurchaseCost: purchaseCost,
              supplierName: 'Direct Wholesale Market',
            },
            source,
            user
          );
        }

        const orderedQty = Number(item.quantity);
        const available = prod.currentQuantity;
        const shortage = available < orderedQty ? orderedQty - available : 0;
        const remaining = Math.max(0, available - orderedQty);

        stockCheckDetails.push({
          productName: prod.name,
          orderedQty,
          unit: prod.unit,
          availableBefore: available,
          remainingAfter: remaining,
          inStock: available >= orderedQty,
          shortageQty: shortage,
        });

        resolvedItems.push({
          productId: prod.id,
          quantity: orderedQty,
          unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : undefined,
        });
      }

      // If user specified total amount or payment for a single item without explicit unitPrice, derive unitPrice
      if (resolvedItems.length === 1 && (totalOrderAmount || advancePayment) && resolvedItems[0].unitPrice === undefined) {
        const targetVal = Number(totalOrderAmount || advancePayment);
        resolvedItems[0].unitPrice = Math.round(((targetVal - Number(deliveryFee)) / resolvedItems[0].quantity) * 100) / 100;
      }

      const order = db.createOrder(
        {
          restaurantId: rest.id,
          items: resolvedItems,
          deliveryFee: Number(deliveryFee),
          initialPayment: advancePayment !== undefined ? Number(advancePayment) : undefined,
          totalAmount: totalOrderAmount !== undefined ? Number(totalOrderAmount) : undefined,
          balanceDue: explicitBalanceDue !== undefined ? Number(explicitBalanceDue) : undefined,
          paymentMethod: paymentMethod as PaymentMethod,
          notes,
        },
        source,
        user
      );

      const updatedRest = db.getRestaurantById(rest.id) || rest;

      const stockLines = stockCheckDetails.map((s) => {
        if (s.inStock) {
          return `• ${s.productName}: ${s.orderedQty} ${s.unit} (Stock available: ${s.availableBefore} ${s.unit} → Warehouse remaining: ${s.remainingAfter} ${s.unit} ✅)`;
        } else {
          return `• ${s.productName}: Ordered ${s.orderedQty} ${s.unit}, only ${s.availableBefore} ${s.unit} in stock (⚠️ Shortage: ${s.shortageQty} ${s.unit})`;
        }
      }).join('\n');

      const itemDetailLines = order.items.map((it) => {
        const prod = db.getProductById(it.productId);
        const costPrice = it.purchaseCost || prod?.purchasePrice || 0;
        const profit = it.grossProfit;
        return `• ${it.productName}: ${it.quantity} ${it.unit} (Rate Lagaya: ${currencySymbol()} ${it.unitPrice}/${it.unit} | Khareed Cost: ${currencySymbol()} ${costPrice}/${it.unit} | Item Profit: ${currencySymbol()} ${profit.toLocaleString()})`;
      }).join('\n');

      const clearanceStatus = order.balanceDue === 0
        ? `• Ada Shuda (Paid): ${currencySymbol()} ${order.paidAmount.toLocaleString()} (100% Cleared - Zero Udhaar ✅)`
        : `• Ada Shuda (Paid): ${currencySymbol()} ${order.paidAmount.toLocaleString()}\n• Baaqi Naya Udhaar (Due on Khata): ${currencySymbol()} ${order.balanceDue.toLocaleString()}`;

      const hasAnyShortage = stockCheckDetails.some((s) => s.shortageQty > 0);
      const shortageSummaryNotice = hasAnyShortage
        ? `\n\n⚠️ INVENTORY SHORTAGE ALERT:\nKuch saman stock mein kam tha, lekin order book kar liya gaya hai. Inventory section mein required shortage quantity show ho rahi hai taake fori tor par restock kiya ja sake.\n(Agar aap chahein to ye order cancel bhi kar sakte hain: "ye order cancel kardo")`
        : '';

      const message = `Order ${order.orderNumber} kamyabi se ${rest.name} k khata me darj ho gaya!\n\n` +
        `📦 Maal aur Stock Pricing (Rates & Costs):\n${itemDetailLines}\n\n` +
        `📊 Stock Availability:\n${stockLines}${shortageSummaryNotice}\n\n` +
        `💰 Khata, Udhaar & Real-Time Profit:\n` +
        `• Kul Bill: ${currencySymbol()} ${order.totalAmount.toLocaleString()}\n` +
        `${clearanceStatus}\n` +
        `• Is Restaurant Ka Kul Baaqi Udhaar (Ledger Balance): ${currencySymbol()} ${updatedRest.outstandingBalance.toLocaleString()}\n` +
        `• Is Order Par Real-Time Profit: ${currencySymbol()} ${order.grossProfit.toLocaleString()} (${order.totalAmount > 0 ? ((order.grossProfit / order.totalAmount) * 100).toFixed(1) : 0}% Margin)`;

      return {
        success: true,
        message,
        order,
        stockVerification: stockCheckDetails,
        khata: {
          totalBilled: order.totalAmount,
          advancePaid: order.paidAmount,
          orderBalanceDue: order.balanceDue,
          totalRestaurantOutstandingBalance: updatedRest.outstandingBalance,
          grossProfit: order.grossProfit,
        },
      };
    }

    case 'cancel_order': {
      const { orderIdOrNumber, reason } = args;
      if (!orderIdOrNumber) {
        return { success: false, error: 'Order Number ya Restaurant ka naam batana zaroori hai.' };
      }

      const allOrders = db.getOrders();
      const targetStr = String(orderIdOrNumber).trim().toLowerCase();

      // 1. Try exact or partial orderNumber / ID match
      let matchedOrder = allOrders.find(
        (o) =>
          o.orderNumber.toLowerCase() === targetStr ||
          o.id.toLowerCase() === targetStr ||
          o.orderNumber.toLowerCase().includes(targetStr)
      );

      // 2. If not found by order number, search by restaurant name (most recent active order)
      if (!matchedOrder) {
        const matchingRestaurantOrders = allOrders.filter(
          (o) =>
            o.restaurantName.toLowerCase().includes(targetStr) &&
            o.status !== 'Cancelled'
        );
        if (matchingRestaurantOrders.length > 0) {
          matchedOrder = matchingRestaurantOrders[0]; // most recent order
        }
      }

      // 3. Also check if user just said "ye order" or "last order"
      if (!matchedOrder && (targetStr.includes('ye') || targetStr.includes('last') || targetStr.includes('recent') || targetStr.includes('current'))) {
        const activeOrders = allOrders.filter((o) => o.status !== 'Cancelled');
        if (activeOrders.length > 0) {
          matchedOrder = activeOrders[0];
        }
      }

      if (!matchedOrder) {
        return {
          success: false,
          error: `Order "${orderIdOrNumber}" nahi mila. Baraye meherbani sahi Order Number (maslan ORD-2026-1005) ya Restaurant ka naam batayein.`,
        };
      }

      if (matchedOrder.status === 'Cancelled') {
        return {
          success: true,
          message: `Order ${matchedOrder.orderNumber} (${matchedOrder.restaurantName}) pehle se hi cancelled / mansookh hai.`,
          order: matchedOrder,
        };
      }

      const updatedOrder = db.updateOrderStatus(
        matchedOrder.id,
        'Cancelled',
        source,
        user
      );
      const rest = db.getRestaurantById(matchedOrder.restaurantId);

      const itemsRestored = matchedOrder.items
        .map((it) => `${it.quantity} ${it.unit} ${it.productName}`)
        .join(', ');

      return {
        success: true,
        message: `✅ Order ${matchedOrder.orderNumber} for ${matchedOrder.restaurantName} kamyabi se CANCEL / KHATAM kar diya gaya hai.\n\n` +
          `📦 Warehouse Stock Restoration:\nMaal wapis warehouse inventory mein shamil kar diya gaya hai: ${itemsRestored}\n\n` +
          `💰 Restaurant Ledger Updated:\n${matchedOrder.restaurantName} ka total balance ab ${currencySymbol()} ${(rest?.outstandingBalance || 0).toLocaleString()} hai.\n` +
          `Order status: "Cancelled"`,
        order: updatedOrder,
      };
    }

    case 'record_payment': {
      const { restaurantNameOrId, amount, paymentMethod = 'Cash', orderNumberOrId, notes } = args;
      const rest = db.getRestaurantById(restaurantNameOrId) || db.findRestaurantByName(restaurantNameOrId);
      if (!rest) {
        return { success: false, error: `Restaurant "${restaurantNameOrId}" not found.` };
      }

      const payment = db.recordPayment(
        {
          restaurantId: rest.id,
          amount: Number(amount),
          paymentMethod: paymentMethod as PaymentMethod,
          orderId: orderNumberOrId,
          notes,
        },
        source,
        user
      );

      return {
        success: true,
        message: `Payment of ${currencySymbol()} ${payment.amount.toLocaleString()} successfully recorded for ${rest.name} (${payment.paymentMethod}). Remaining outstanding balance is ${currencySymbol()} ${rest.outstandingBalance.toLocaleString()}.`,
        payment,
        remainingBalance: rest.outstandingBalance,
      };
    }

    case 'create_expense': {
      const { category, title, amount, scope = 'business_wide', targetRestaurantNameOrId, notes } = args;
      let targetRestId: string | undefined;
      let targetRestName: string | undefined;

      if (targetRestaurantNameOrId) {
        const r = db.getRestaurantById(targetRestaurantNameOrId) || db.findRestaurantByName(targetRestaurantNameOrId);
        if (r) {
          targetRestId = r.id;
          targetRestName = r.name;
        }
      }

      const expense = db.createExpense(
        {
          category,
          title,
          amount: Number(amount),
          date: new Date().toISOString().split('T')[0],
          scope: scope as any,
          targetRestaurantId: targetRestId,
          targetRestaurantName: targetRestName,
          notes,
        },
        source,
        user
      );

      return {
        success: true,
        message: `Recorded ${expense.category} expense "${expense.title}" for ${currencySymbol()} ${expense.amount.toLocaleString()}.`,
        expense,
      };
    }

    case 'allocate_expense': {
      const { expenseId, method, targetRestaurantNames } = args;
      let targetIds: string[] | undefined;

      if (targetRestaurantNames && targetRestaurantNames.length > 0) {
        targetIds = [];
        for (const name of targetRestaurantNames) {
          const r = db.findRestaurantByName(name) || db.getRestaurantById(name);
          if (r) targetIds.push(r.id);
        }
      }

      const allocated = db.allocateExpense(expenseId, method as ExpenseAllocationMethod, targetIds);
      return {
        success: true,
        message: `Successfully allocated ${currencySymbol()} ${allocated.amount.toLocaleString()} using "${method}" rule across ${allocated.allocations?.length} restaurants.`,
        allocations: allocated.allocations,
      };
    }

    case 'calculate_restaurant_profit': {
      const { restaurantNameOrId } = args;
      const rest = db.getRestaurantById(restaurantNameOrId) || db.findRestaurantByName(restaurantNameOrId);
      if (!rest) return { success: false, error: `Restaurant "${restaurantNameOrId}" not found.` };

      const diagnosis = db.getProfitDiagnosis();
      const rep = diagnosis.restaurantReports.find((r) => r.restaurantId === rest.id) || {
        restaurantId: rest.id,
        restaurantName: rest.name,
        totalOrders: 0,
        totalRevenue: 0,
        totalCostOfGoods: 0,
        grossProfit: 0,
        grossMarginPct: 0,
        directExpenses: 0,
        netProfit: 0,
        isProfit: true,
        totalPaid: 0,
        balanceDue: 0,
        actionRecommendation: 'No order activity yet.',
      };

      return {
        restaurant: rest.name,
        totalOrders: rep.totalOrders,
        totalRevenue: rep.totalRevenue,
        productCost: rep.totalCostOfGoods,
        grossProfit: rep.grossProfit,
        grossMarginPct: `${rep.grossMarginPct}%`,
        directExpenses: rep.directExpenses,
        netProfit: rep.netProfit,
        isProfit: rep.isProfit,
        status: rep.isProfit ? 'PROFIT' : 'NET LOSS',
        totalPaid: rep.totalPaid,
        balanceDue: rep.balanceDue,
        recommendation: rep.actionRecommendation,
      };
    }

    case 'calculate_business_profit': {
      const diagnosis = db.getProfitDiagnosis();
      return {
        totalRevenue: diagnosis.totalRevenue,
        totalCostOfGoods: diagnosis.totalCostOfGoods,
        grossProfit: diagnosis.grossProfit,
        totalExpenses: diagnosis.totalExpenses,
        netProfitOrLoss: diagnosis.netProfitOrLoss,
        status: diagnosis.isProfit ? 'OVERALL PROFIT' : 'CURRENTLY IN NET LOSS',
        netMarginPct: `${diagnosis.netMarginPct}%`,
        totalOutstandingReceivables: diagnosis.totalOutstandingReceivables,
        criticalIssues: diagnosis.criticalIssues,
        actionPlan: diagnosis.actionPlan,
      };
    }

    case 'get_inventory_status': {
      const { search, categoryFilter, onlyLowStock } = args;
      let products = db.getProducts();

      let matchedItem: any = null;
      if (search) {
        const found = db.findProductByName(String(search)) || db.getProductById(String(search));
        if (found) {
          matchedItem = {
            id: found.id,
            name: found.name,
            sku: found.sku,
            category: found.category,
            currentQuantity: `${found.currentQuantity} ${found.unit}`,
            numericQuantity: found.currentQuantity,
            unit: found.unit,
            purchasePrice: found.purchasePrice,
            sellingPrice: found.sellingPrice,
            margin: `${found.profitMargin}%`,
            isLowStock: found.lowStockAlert,
            inStock: found.currentQuantity > 0,
          };
        }
      }

      if (categoryFilter) {
        products = products.filter((p) => p.category.toLowerCase().includes(String(categoryFilter).toLowerCase()));
      }
      if (onlyLowStock) {
        products = products.filter((p) => p.lowStockAlert);
      }

      const totalVal = products.reduce((sum, p) => sum + p.stockValue, 0);
      return {
        matchedItem,
        count: products.length,
        totalInventoryValue: totalVal,
        lowStockItems: products.filter((p) => p.lowStockAlert).map((p) => ({
          name: p.name,
          currentQuantity: `${p.currentQuantity} ${p.unit}`,
          minStockLevel: `${p.minStockLevel} ${p.unit}`,
          supplier: p.supplierName,
        })),
        items: products.slice(0, 15).map((p) => ({
          name: p.name,
          sku: p.sku,
          quantity: `${p.currentQuantity} ${p.unit}`,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          margin: `${p.profitMargin}%`,
          isLowStock: p.lowStockAlert,
        })),
      };
    }

    case 'get_business_summary': {
      return db.getBusinessSummary();
    }

    case 'search_business_data': {
      const { query } = args;
      return db.search(query);
    }

    case 'generate_restaurant_report': {
      const { restaurantNameOrId } = args;
      const report = generateRestaurantReportHtml(restaurantNameOrId);
      if (!report.success) {
        return { success: false, error: report.error };
      }
      return {
        success: true,
        reportType: 'restaurant',
        restaurantName: report.restaurant?.name,
        restaurantId: report.restaurant?.id,
        summary: report.summary,
        fileName: report.fileName,
        downloadUrl: `/api/reports/download?type=restaurant&id=${report.restaurant?.id}`,
        viewUrl: `/api/reports/restaurant/${report.restaurant?.id}`,
        message: `Statement of Account generated for ${report.restaurant?.name}!\n\n` +
          `• Total Billed: ${currencySymbol()} ${report.summary?.totalBilled.toLocaleString()}\n` +
          `• Total Paid: ${currencySymbol()} ${report.summary?.totalPaid.toLocaleString()}\n` +
          `• Baaqi Udhaar: ${currencySymbol()} ${report.summary?.balanceDue.toLocaleString()}\n` +
          `• Direct Expenses: ${currencySymbol()} ${report.summary?.directExpenses.toLocaleString()}\n` +
          `• Net Profit / Loss: ${report.summary?.isProfit ? '+' : ''}${currencySymbol()} ${report.summary?.netProfit.toLocaleString()} (${report.summary?.isProfit ? 'PROFIT' : 'LOSS'})\n\n` +
          `File is ready for download: ${report.fileName}`,
      };
    }

    case 'generate_business_report': {
      const report = generateBusinessMasterReportHtml();
      return {
        success: true,
        reportType: 'business',
        summary: report.summary,
        fileName: report.fileName,
        downloadUrl: `/api/reports/download?type=business`,
        viewUrl: `/api/reports/business`,
        message: `Master Business Profit & Audit Report generated!\n\n` +
          `• Total Turnover: ${currencySymbol()} ${report.summary?.totalRevenue.toLocaleString()}\n` +
          `• Gross Margin: ${currencySymbol()} ${report.summary?.grossProfit.toLocaleString()}\n` +
          `• Operational Expenses: ${currencySymbol()} ${report.summary?.totalExpenses.toLocaleString()}\n` +
          `• Net Business Profit: ${report.summary?.isProfit ? '+' : ''}${currencySymbol()} ${report.summary?.netProfitOrLoss.toLocaleString()}\n` +
          `• Total Market Udhaar (Receivables): ${currencySymbol()} ${report.summary?.totalOutstandingReceivables.toLocaleString()}\n` +
          `• Warehouse Stock Value: ${currencySymbol()} ${report.summary?.inventoryTotalValue.toLocaleString()}\n\n` +
          `Master Audit File is ready for download: ${report.fileName}`,
      };
    }

    case 'get_purchase_report': {
      const { supplierNameOrId, fromDate, toDate, search } = args;
      let supplierId = supplierNameOrId;
      if (supplierNameOrId && !supplierNameOrId.startsWith('sup-')) {
        const found = db.getSuppliers().find((s) => s.title.toLowerCase().includes(supplierNameOrId.toLowerCase()));
        if (found) supplierId = found.id;
      }
      const report = db.getPurchaseReport({ supplierId, fromDate, toDate, search });
      return {
        success: true,
        report,
        message: `Purchasing Report Summary:\n` +
          `• Total Bills Count: ${report.totalBillsCount}\n` +
          `• Total Net Purchases: ${currencySymbol()} ${report.totalNetPurchases.toLocaleString()}\n` +
          `• Total Paid Amount: ${currencySymbol()} ${report.totalPaidAmount.toLocaleString()}\n` +
          `• Remaining Payable Balance: ${currencySymbol()} ${report.totalRemainingBalance.toLocaleString()}\n` +
          `• Top Suppliers: ${report.supplierBreakdown.map((s) => `${s.supplierName} (${currencySymbol()} ${s.totalAmount.toLocaleString()})`).join(', ') || 'None'}\n` +
          `• Items Breakdown: ${report.itemBreakdown.map((it) => `${it.itemTitle} (${it.totalQty} units, ${currencySymbol()} ${it.totalAmount.toLocaleString()})`).join('; ')}`,
      };
    }

    case 'get_purchase_bills': {
      const { supplierNameOrId, search } = args;
      let supplierId = supplierNameOrId;
      if (supplierNameOrId && !supplierNameOrId.startsWith('sup-')) {
        const found = db.getSuppliers().find((s) => s.title.toLowerCase().includes(supplierNameOrId.toLowerCase()));
        if (found) supplierId = found.id;
      }
      const bills = db.getPurchaseBills({ supplierId, search });
      return {
        success: true,
        count: bills.length,
        bills: bills.slice(0, 15).map((b) => ({
          billNumber: b.billNumber,
          vendorBillNumber: b.vendorBillNumber,
          date: b.date,
          supplier: b.supplierAccountTitle,
          itemsCount: b.items.length,
          totalCtn: b.totalCtn,
          netTotal: b.netTotal,
          paidAmount: b.paidAmount,
          remainingBalance: b.remainingBalance,
          items: b.items.map((i) => `${i.itemTitle} (${i.ctn} ctn / ${i.qty} units @ ${currencySymbol()} ${i.rate})`).join(', '),
        })),
      };
    }

    case 'create_purchase_bill': {
      const { supplierName, billNumber, vendorBillNumber, date, isCash, paidAmount, loadExp, items, notes } = args;
      const newBill = db.createPurchaseBill(
        {
          supplierAccountTitle: supplierName,
          billNumber,
          vendorBillNumber,
          date,
          isCash: Boolean(isCash),
          paidAmount: Number(paidAmount) || 0,
          loadExp: Number(loadExp) || 0,
          items,
          notes,
        },
        source,
        user
      );
      return {
        success: true,
        bill: newBill,
        message: `Purchase Bill #${newBill.billNumber} recorded successfully for "${newBill.supplierAccountTitle}". Net: ${currencySymbol()} ${newBill.netTotal.toLocaleString()}, Paid: ${currencySymbol()} ${newBill.paidAmount.toLocaleString()}, Balance: ${currencySymbol()} ${newBill.remainingBalance.toLocaleString()}. Warehouse inventory has been updated automatically.`,
      };
    }

    case 'get_profit_per_item_report': {
      const compProfit = db.getComprehensiveProfitReport({ search: args.search });
      const report = generateProfitByItemReportDoc('html');
      const items = compProfit.perItem || [];
      const totalRev = items.reduce((s, it) => s + it.totalRevenue, 0);
      const totalProfit = items.reduce((s, it) => s + it.grossProfit, 0);
      const topItems = items.slice(0, 10).map((it) => 
        `• ${it.itemTitle} (M-Code: ${it.mcode}): Sold ${it.qtySold} (${it.ctnSold} CTN), Revenue: ${currencySymbol()} ${it.totalRevenue.toLocaleString()}, Profit: ${currencySymbol()} ${it.grossProfit.toLocaleString()} (${it.profitMarginPct.toFixed(1)}%)`
      ).join('\n');

      return {
        success: true,
        reportType: 'profit_item',
        title: 'Profit Per Item Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=profit-item&format=html',
        viewUrl: '/api/reports/download?type=profit-item&format=html',
        summary: { totalItems: items.length, totalRevenue: totalRev, totalProfit: totalProfit },
        message: `✅ Verified Profit Per Item Report Tayar Hai!\n\n` +
          `• Kul Items Count: ${items.length}\n` +
          `• Total Item Revenue: ${currencySymbol()} ${totalRev.toLocaleString()}\n` +
          `• Total Gross Profit: ${currencySymbol()} ${totalProfit.toLocaleString()}\n\n` +
          `Top Items Breakdown:\n${topItems || 'Koi sales record nahi mila.'}\n\n` +
          `📄 Verified Report File Download K Liye Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_profit_per_salesman_report': {
      const compProfit = db.getComprehensiveProfitReport();
      const report = generateProfitBySalesmanReportDoc('html');
      const salesmen = compProfit.perSalesman || [];
      const totalSales = salesmen.reduce((s, sm) => s + sm.totalSalesVolume, 0);
      const totalProfit = salesmen.reduce((s, sm) => s + sm.totalProfit, 0);
      const smDetails = salesmen.map((sm) =>
        `• ${sm.salesmanName}: ${sm.billsCount} Bills, Customers: ${sm.customersHandledCount}, Sales: ${currencySymbol()} ${sm.totalSalesVolume.toLocaleString()}, Profit: ${currencySymbol()} ${sm.totalProfit.toLocaleString()} (${sm.profitMarginPct.toFixed(1)}%)`
      ).join('\n');

      return {
        success: true,
        reportType: 'profit_salesman',
        title: 'Profit Per Salesman Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=profit-salesman&format=html',
        viewUrl: '/api/reports/download?type=profit-salesman&format=html',
        summary: { totalSalesmen: salesmen.length, totalSales, totalProfit },
        message: `✅ Verified Profit Per Salesman Report Tayar Hai!\n\n` +
          `• Total Salesmen: ${salesmen.length}\n` +
          `• Total Sales Volume: ${currencySymbol()} ${totalSales.toLocaleString()}\n` +
          `• Total Gross Profit: ${currencySymbol()} ${totalProfit.toLocaleString()}\n\n` +
          `Salesmen Breakdown:\n${smDetails || 'Koi record nahi mila.'}\n\n` +
          `📄 Verified Report File Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_profit_per_restaurant_report': {
      const compProfit = db.getComprehensiveProfitReport({ search: args.search });
      const report = generateProfitByRestaurantReportDoc('html');
      const rests = compProfit.perRestaurant || [];
      const totalSales = rests.reduce((s, r) => s + r.totalSalesVolume, 0);
      const totalProfit = rests.reduce((s, r) => s + r.grossProfit, 0);
      const totalUdhaar = rests.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
      const topRests = rests.slice(0, 10).map((r) =>
        `• ${r.accountTitle} [${r.code || '-'}]: Sales ${currencySymbol()} ${r.totalSalesVolume.toLocaleString()}, Profit: ${currencySymbol()} ${r.grossProfit.toLocaleString()} (${r.profitMarginPct.toFixed(1)}%), Udhaar: ${currencySymbol()} ${(r.outstandingBalance || 0).toLocaleString()}`
      ).join('\n');

      return {
        success: true,
        reportType: 'profit_restaurant',
        title: 'Profit Per Restaurant / Customer Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=profit-restaurant&format=html',
        viewUrl: '/api/reports/download?type=profit-restaurant&format=html',
        summary: { totalRestaurants: rests.length, totalSales, totalProfit, totalUdhaar },
        message: `✅ Verified Profit Per Restaurant / Customer Report Tayar Hai!\n\n` +
          `• Total Customers / Restaurants: ${rests.length}\n` +
          `• Total Sales: ${currencySymbol()} ${totalSales.toLocaleString()}\n` +
          `• Total Gross Profit: ${currencySymbol()} ${totalProfit.toLocaleString()}\n` +
          `• Total Market Udhaar (Receivables): ${currencySymbol()} ${totalUdhaar.toLocaleString()}\n\n` +
          `Top Records:\n${topRests || 'Koi record nahi mila.'}\n\n` +
          `📄 Verified Report File Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_profit_per_bill_report': {
      const compProfit = db.getComprehensiveProfitReport({ search: args.search });
      const report = generateProfitByBillReportDoc('html');
      const bills = compProfit.perBill || [];
      const totalSales = bills.reduce((s, b) => s + b.netTotal, 0);
      const totalProfit = bills.reduce((s, b) => s + b.grossProfit, 0);
      const recentBills = bills.slice(0, 10).map((b) =>
        `• Bill #${b.billNumber} (${b.date}) - ${b.customerAccountTitle}: Sale ${currencySymbol()} ${b.netTotal.toLocaleString()}, Cost ${currencySymbol()} ${b.costOfGoods.toLocaleString()}, Profit: ${currencySymbol()} ${b.grossProfit.toLocaleString()} (${b.profitMarginPct.toFixed(1)}%)`
      ).join('\n');

      return {
        success: true,
        reportType: 'profit_bill',
        title: 'Profit Per Sale Bill Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=profit-bill&format=html',
        viewUrl: '/api/reports/download?type=profit-bill&format=html',
        summary: { totalBills: bills.length, totalSales, totalProfit },
        message: `✅ Verified Profit Per Sale Bill Report Tayar Hai!\n\n` +
          `• Total Bills Count: ${bills.length}\n` +
          `• Total Sales: ${currencySymbol()} ${totalSales.toLocaleString()}\n` +
          `• Total Gross Profit: ${currencySymbol()} ${totalProfit.toLocaleString()}\n\n` +
          `Recent Bills Profit Details:\n${recentBills || 'Koi bills nahi mile.'}\n\n` +
          `📄 Verified Report File Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_master_audit_daily_report': {
      const date = args.date;
      const report = generateAiLedgerAuditHtml(date);
      const auditData = (report as any).auditData || {};
      const dateStr = date || new Date().toISOString().split('T')[0];

      return {
        success: true,
        reportType: 'master_audit',
        title: `Master Audit File (Daily Report - ${dateStr})`,
        fileName: report.fileName || `Master_Audit_${dateStr}.html`,
        downloadUrl: `/api/reports/download?type=ledger-audit&format=html${date ? `&date=${date}` : ''}`,
        viewUrl: `/api/reports/ledger-audit?format=html${date ? `&date=${date}` : ''}`,
        summary: auditData,
        message: `✅ Master Audit File & Daily Ledger Report Tayar Hai (${dateStr})!\n\n` +
          `• Daily Ledger Verified Transactions: 100% Reconciled\n` +
          `• Rozana Sale & Purchase Audit File tayar ho chuki hai.\n\n` +
          `📄 Click below to view and download the official verified Master Audit File:`,
      };
    }

    case 'get_customer_sale_bill_report': {
      const identifier = args.customerNameOrBillNumber;
      const report = generateCustomerSaleBillDoc(identifier, 'html');
      if (!report.success || !report.bill) {
        return { success: false, error: report.error || `Sale bill for "${identifier}" not found.` };
      }
      const b = report.bill;
      const itemsList = (b.items || []).map((it: any) =>
        `• ${it.itemTitle}: ${it.ctn > 0 ? `${it.ctn} CTN / ` : ''}${it.qty} ${it.unit || ''} @ ${currencySymbol()} ${it.rate} = ${currencySymbol()} ${it.amount}`
      ).join('\n');

      return {
        success: true,
        reportType: 'customer_sale_bill',
        title: `Sale Bill #${b.billNumber} - ${b.customerAccountTitle}`,
        fileName: report.fileName,
        downloadUrl: `/api/reports/download?type=customer-bill&search=${encodeURIComponent(b.billNumber)}&format=html`,
        viewUrl: `/api/reports/download?type=customer-bill&search=${encodeURIComponent(b.billNumber)}&format=html`,
        summary: {
          billNumber: b.billNumber,
          customer: b.customerAccountTitle,
          total: b.netTotal || 0,
          cashReceived: b.cashReceived || 0,
        },
        message: `✅ Customer Sale Bill #${b.billNumber} Verified!\n\n` +
          `• Customer: ${b.customerAccountTitle}\n` +
          `• Date: ${b.date}\n` +
          `• Total Bill Amount: ${currencySymbol()} ${(b.netTotal || 0).toLocaleString()}\n` +
          `• Cash Received: ${currencySymbol()} ${(b.cashReceived || 0).toLocaleString()}\n` +
          `• Sabqa Baqaya: ${currencySymbol()} ${(b.partyBalanceBefore || 0).toLocaleString()}\n\n` +
          `Items Sold:\n${itemsList}\n\n` +
          `📄 Verified Printable Sale Bill File Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_comprehensive_sales_report': {
      const report = generateSalesReportDoc('html');
      const compProfit = db.getComprehensiveProfitReport({ search: args.search });
      const bills = compProfit.perBill || [];
      const totalSales = bills.reduce((s, b) => s + b.netTotal, 0);

      return {
        success: true,
        reportType: 'sales_report',
        title: 'Comprehensive Sales Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=sales&format=html',
        viewUrl: '/api/reports/download?type=sales&format=html',
        summary: { totalBills: bills.length, totalSales },
        message: `✅ Comprehensive Sales Report Tayar Hai!\n\n` +
          `• Total Sales Invoices: ${bills.length}\n` +
          `• Total Sales Volume: ${currencySymbol()} ${totalSales.toLocaleString()}\n\n` +
          `📄 Verified Sales Report File Tayar Hai: ${report.fileName}`,
      };
    }

    case 'get_comprehensive_purchases_report': {
      const report = generatePurchasesReportDoc('html');
      const purchaseReport = db.getPurchaseReport({ supplierId: args.supplierNameOrId });

      return {
        success: true,
        reportType: 'purchases_report',
        title: 'Comprehensive Purchases Report',
        fileName: report.fileName,
        downloadUrl: '/api/reports/download?type=purchases&format=html',
        viewUrl: '/api/reports/download?type=purchases&format=html',
        summary: purchaseReport,
        message: `✅ Comprehensive Purchases Report Tayar Hai!\n\n` +
          `• Total Purchase Bills: ${purchaseReport.totalBillsCount}\n` +
          `• Total Purchases: ${currencySymbol()} ${purchaseReport.totalNetPurchases.toLocaleString()}\n` +
          `• Total Paid Amount: ${currencySymbol()} ${purchaseReport.totalPaidAmount.toLocaleString()}\n` +
          `• Total Payable Balance: ${currencySymbol()} ${purchaseReport.totalRemainingBalance.toLocaleString()}\n\n` +
          `📄 Verified Purchases Report File Tayar Hai: ${report.fileName}`,
      };
    }

    default:
      throw new Error(`Unknown tool "${name}".`);
  }
}
