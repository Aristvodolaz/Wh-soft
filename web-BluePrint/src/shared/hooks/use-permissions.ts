import { useAuthStore } from '@/features/auth/store/auth-store'
import { Role } from '@/entities/auth/types'

// ─── Permission matrix ────────────────────────────────────────────────────────
//
//  Action                SUPER_ADMIN  WAREHOUSE_ADMIN  MANAGER  WORKER  ANALYST
//  ─────────────────     ──────────   ───────────────  ───────  ──────  ───────
//  nav: dashboard        ✅           ✅               ✅       ✅      ✅
//  nav: warehouses       ✅           ✅               ✅       ✅      ❌
//  nav: receiving        ✅           ✅               ✅       ✅      ❌
//  nav: products         ✅           ✅               ✅       ✅      ✅
//  nav: orders           ✅           ✅               ✅       ❌      ✅
//  nav: tasks            ✅           ✅               ✅       ❌      ❌
//  nav: my-tasks         ✅           ✅               ✅       ✅      ❌
//  nav: employees        ✅           ✅               ✅       ❌      ❌
//  nav: analytics        ✅           ✅               ✅       ❌      ✅
//  nav: integrations     ✅           ❌               ❌       ❌      ❌
//  nav: audit            ✅           ✅               ✅       ❌      ❌
//  employees: add        ✅           ✅               ❌       ❌      ❌
//  employees: edit       ✅           ✅               ❌       ❌      ❌
//  employees: delete     ✅           ✅               ❌       ❌      ❌
//  employees: assign     ✅           ✅               ✅       ❌      ❌
//  warehouse: print      ✅           ✅               ✅       ❌      ❌
//  inventory: adjust     ✅           ✅               ✅       ❌      ❌

export interface Permissions {
  // Navigation
  nav: {
    dashboard: boolean
    warehouses: boolean
    receiving: boolean
    products: boolean
    orders: boolean
    tasks: boolean
    myTasks: boolean
    employees: boolean
    analytics: boolean
    integrations: boolean
    audit: boolean
  }
  // Employees module
  employees: {
    view: boolean
    add: boolean
    edit: boolean
    remove: boolean
    assign: boolean
  }
  // Warehouse / zones
  warehouse: {
    print: boolean
  }
  // Inventory
  inventory: {
    adjust: boolean
  }
}

const PERMISSIONS: Record<Role, Permissions> = {
  [Role.SUPER_ADMIN]: {
    nav: {
      dashboard: true, warehouses: true, receiving: true, products: true,
      orders: true, tasks: true, myTasks: true, employees: true,
      analytics: true, integrations: true, audit: true,
    },
    employees: { view: true, add: true, edit: true, remove: true, assign: true },
    warehouse: { print: true },
    inventory: { adjust: true },
  },

  [Role.WAREHOUSE_ADMIN]: {
    nav: {
      dashboard: true, warehouses: true, receiving: true, products: true,
      orders: true, tasks: true, myTasks: true, employees: true,
      analytics: true, integrations: false, audit: true,
    },
    employees: { view: true, add: true, edit: true, remove: true, assign: true },
    warehouse: { print: true },
    inventory: { adjust: true },
  },

  [Role.MANAGER]: {
    nav: {
      dashboard: true, warehouses: true, receiving: true, products: true,
      orders: true, tasks: true, myTasks: true, employees: true,
      analytics: true, integrations: false, audit: true,
    },
    employees: { view: true, add: false, edit: false, remove: false, assign: true },
    warehouse: { print: true },
    inventory: { adjust: true },
  },

  [Role.WORKER]: {
    nav: {
      dashboard: true, warehouses: true, receiving: true, products: true,
      orders: false, tasks: false, myTasks: true, employees: false,
      analytics: false, integrations: false, audit: false,
    },
    employees: { view: false, add: false, edit: false, remove: false, assign: false },
    warehouse: { print: false },
    inventory: { adjust: false },
  },

  [Role.ANALYST]: {
    nav: {
      dashboard: true, warehouses: false, receiving: false, products: true,
      orders: true, tasks: false, myTasks: false, employees: false,
      analytics: true, integrations: false, audit: false,
    },
    employees: { view: false, add: false, edit: false, remove: false, assign: false },
    warehouse: { print: false },
    inventory: { adjust: false },
  },
}

/** Returns the permission set for the current logged-in user. */
export function usePermissions(): Permissions {
  const user = useAuthStore((s) => s.user)

  if (!user?.role || !(user.role in PERMISSIONS)) {
    // Unauthenticated / unknown role → minimal access
    return PERMISSIONS[Role.WORKER]
  }

  return PERMISSIONS[user.role]
}

/** Returns the current user's role, or null if unauthenticated. */
export function useRole(): Role | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

/** True if the current user has at least one of the given roles. */
export function useHasRole(...roles: Role[]): boolean {
  const role = useRole()
  return role !== null && roles.includes(role)
}
