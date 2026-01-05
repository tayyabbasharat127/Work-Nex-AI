import React from "react";
import "./searchBox.css";
import { Search } from "lucide-react";

export const SearchBox: React.FC = () => {
  return (
    <>
      <div className="header">
        <div className="search-box">
          <input type="text" placeholder="Search.... " />
          <Search size={20} />
        </div>
      </div>
    </>
  );
};
