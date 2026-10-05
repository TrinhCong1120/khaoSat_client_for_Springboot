"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import * as FiIcons from "react-icons/fi";
import { FiChevronDown, FiMoreHorizontal } from "react-icons/fi";
import { API_MENUS } from "@/lib/api";

// ======================
// TYPE
// ======================
type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  children?: NavItem[];
};

// ======================
// TOKEN
// ======================
const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

// ======================
// ICON HELPER
// ======================
const getIcon = (iconName: string) => {
  // Map common names to Fi icons
  const map: Record<string, keyof typeof FiIcons> = {
    GridIcon: "FiGrid",
    UserIcon: "FiUser",
    GroupIcon: "FiUsers",
    FolderIcon: "FiFolder",
    TableIcon: "FiTable",
    PieChartIcon: "FiPieChart",
    CalenderIcon: "FiCalendar",
    CalendarIcon: "FiCalendar",
    DocsIcon: "FiFileText",
    FileIcon: "FiFile",
    PageIcon: "FiFileText",
    MailIcon: "FiMail",
    BellIcon: "FiBell",
    PlusIcon: "FiPlus",
    TrashBinIcon: "FiTrash2",
    PencilIcon: "FiEdit3",
    Settings: "FiSettings",
    LayoutDashboard: "FiGrid",
    ClipboardList: "FiList",
    ListIcon: "FiList",
    TaskIcon: "FiCheckSquare",
    CheckCircleIcon: "FiCheckCircle",
    AlertIcon: "FiAlertTriangle",
    InfoIcon: "FiInfo",
    ErrorIcon: "FiAlertOctagon",
    BoltIcon: "FiZap",
    ArrowRightIcon: "FiArrowRight",
    ChevronDownIcon: "FiChevronDown",
    ChevronUpIcon: "FiChevronUp",
    ChevronLeftIcon: "FiChevronLeft",
    ChevronRightIcon: "FiChevronRight",
    PlugInIcon: "FiLayers",
    BoxCubeIcon: "FiBox",
    BoxIcon: "FiBox",
    UserCircleIcon: "FiUser",
    LockIcon: "FiLock",
  };

  if (!iconName) return <FiIcons.FiGrid size={20} />;

  const fiName = map[iconName] || (iconName.startsWith("Fi") ? iconName : `Fi${iconName}`);
  const IconComponent = (FiIcons as any)[fiName] || FiIcons.FiGrid;
  
  return <IconComponent size={20} />;
};

// ======================
// COMPONENT
// ======================
const AdminSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const expanded = isExpanded || isHovered || isMobileOpen;

  // ======================
  // MENU MAPPING (Translated)
  // ======================
  const translationMap: Record<string, string> = {
    Dashboard: "Bảng điều khiển",
    Users: "Người dùng",
    Roles: "Quyền hạn",
    Menus: "Quản lý Menu",
    Surveys: "Khảo sát",
    Results: "Kết quả",
    Settings: "Cài đặt",
    Profile: "Cá nhân",
    "Sign In": "Đăng nhập",
    "Sign Up": "Đăng ký",
    "Error 404": "Lỗi 404",
    "Form Elements": "Mẫu Form",
    Tables: "Bảng biểu",
    Charts: "Biểu đồ",
    Calendar: "Lịch",
    Buttons: "Nút bấm",
    Modals: "Hộp thoại",
    Videos: "Video",
    UI: "Giao diện",
    Auth: "Xác thực",
    Pages: "Trang",
  };

  const translateName = (name: string) => translationMap[name] || name;

  const [menuData, setMenuData] = useState<NavItem[]>([]);
  const [openSubmenu, setOpenSubmenu] = useState<{ index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ======================
  // FETCH MENU
  // ======================
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(
          `${API_MENUS}/my-menu`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.status === 401) {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/signin";
          return;
        }

        const data = await res.json();

        const convert = (items: any[]): NavItem[] =>
          items.map((item) => ({
            name: translateName(item.name),
            path: item.path ? "/admin" + item.path : undefined,
            icon: getIcon(item.icon),
            children:
              item.children?.length > 0
                ? convert(item.children)
                : undefined,
          }));

        setMenuData(convert(data));
      } catch (err) {
        console.error(err);
      }
    };

    fetchMenu();
  }, []);

  // ======================
  // ACTIVE CHECK
  // ======================
  const isActive = useCallback(
    (path?: string) => path === pathname,
    [pathname]
  );

  // ======================
  // AUTO OPEN SUBMENU
  // ======================
  useEffect(() => {
    let found = false;

    menuData.forEach((nav, index) => {
      nav.children?.forEach((sub) => {
        if (isActive(sub.path)) {
          setOpenSubmenu({ index });
          found = true;
        }
      });
    });

    if (!found) setOpenSubmenu(null);
  }, [pathname, menuData, isActive]);

  // ======================
  // MEASURE HEIGHT
  // ======================
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.index}`;
      const el = subMenuRefs.current[key];
      if (el) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: el.scrollHeight,
        }));
      }
    }
  }, [openSubmenu]);

  const toggleSubmenu = (index: number) => {
    setOpenSubmenu((prev) =>
      prev?.index === index ? null : { index }
    );
  };

  // ======================
  // RENDER MENU
  // ======================
  const renderMenu = () => (
    <ul className="flex flex-col gap-2">
      {menuData.map((nav, index) => (
        <li key={nav.name}>
          {nav.children ? (
            <button
              onClick={() => toggleSubmenu(index)}
              className={`menu-item group w-full ${
                openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } ${!expanded ? "md:justify-center" : "md:justify-start"}`}
            >
              <span
                className={
                  openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>

              {expanded && (
                <span className="menu-item-text font-bold text-sm">{nav.name}</span>
              )}

              {expanded && (
                <FiChevronDown
                  className={`ml-auto w-4 h-4 transition-transform duration-300 ${
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path)
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } ${!expanded ? "md:justify-center" : ""}`}
              >
                <span
                  className={
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }
                >
                  {nav.icon}
                </span>

                {expanded && (
                  <span className="menu-item-text font-bold text-sm tracking-tight">{nav.name}</span>
                )}
              </Link>
            )
          )}

          {/* SUBMENU */}
          {nav.children && expanded && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                height:
                  openSubmenu?.index === index
                    ? subMenuHeight[index]
                    : 0,
              }}
            >
              <ul className="mt-1 space-y-1 ml-11 border-l-2 border-gray-100 dark:border-gray-800">
                {nav.children.map((sub) => (
                  <li key={sub.name}>
                    <Link
                      href={sub.path || "#"}
                      className={`block py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all
                        ${
                          isActive(sub.path)
                            ? "text-brand-500 dark:text-brand-400"
                            : "text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                        }`}
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  // ======================
  // UI
  // ======================
  return (
    <aside
      className={`fixed z-50 mt-16 flex flex-col md:mt-0 top-0 px-3 left-0
        bg-white dark:bg-gray-900 dark:border-gray-800
        h-screen transition-all duration-300 z-50 md:z-50 border-r border-gray-100/50
        scrollbar-none
        ${expanded ? "w-[264px]" : "w-[68px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LOGO SECTION */}
      <div
        className={`py-10 flex ${
          !expanded ? "md:justify-center" : "justify-start px-2"
        }`}
      >
        <Link href="/admin">
          {expanded ? (
            <div className="flex items-center gap-2">
               <Image
                 className="dark:hidden"
                 src="/images/logo/logo.svg"
                 alt="Logo"
                 width={150}
                 height={40}
                 style={{ height: "auto" }}
               />
               <Image
                 className="hidden dark:block"
                 src="/images/logo/logo-dark.svg"
                 alt="Logo"
                 width={150}
                 height={40}
                 style={{ height: "auto" }}
               />
            </div>
          ) : (
            <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={24}
                height={24}
              />
            </div>
          )}
        </Link>
      </div>

      {/* NAVIGATION MENU */}
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-6">
        <nav className="space-y-1">
          <div className={`mb-4 px-3 flex ${!expanded ? "justify-center" : "justify-between items-center"}`}>
            {expanded ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                Menu chính
              </span>
            ) : (
              <FiMoreHorizontal className="text-gray-300 dark:text-gray-700" />
            )}
          </div>

          {renderMenu()}
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
