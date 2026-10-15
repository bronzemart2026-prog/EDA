import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Briefcase, FileText, User, Receipt } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <Home size={20} />
        </div>
        <span>হোম</span>
      </NavLink>

      <NavLink to="/members" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <Users size={20} />
        </div>
        <span>সদস্য</span>
      </NavLink>

      <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <Briefcase size={20} />
        </div>
        <span>প্রজেক্ট</span>
      </NavLink>

      <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <Receipt size={20} />
        </div>
        <span>খরচ</span>
      </NavLink>

      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <FileText size={20} />
        </div>
        <span>রিপোর্ট</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="nav-icon-wrap">
          <User size={20} />
        </div>
        <span>প্রোফাইল</span>
      </NavLink>
    </nav>
  );
}
