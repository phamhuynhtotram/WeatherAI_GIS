// File: Header.jsx

import React, { useState, useEffect } from 'react';

function AppHeader({ onSearch, onOpenModal, currentCity }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(searchQuery);
        setSearchQuery(""); 
    };

    return (
        <header className="app-header">
            <div className="header-content-wrapper">
            <div className="top-bar">
                <span>
                    <span>📍 Thành phố: <strong>{currentCity}</strong></span>
                </span>
                <span>
                    Giờ địa phương: {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | {currentTime.toLocaleDateString('vi-VN')}
                </span>
            </div>

            <nav className="main-nav">
                <div className="logo-container">
                    <img src="https://placehold.co/100x40/1a1a2e/ffc400?text=Weather+AI" alt="Logo" className="logo" />
                </div>

                <form className="header-search-bar" onSubmit={handleSubmit}>
                    <button type="submit">🔍</button>
                        <input 
                            type="text" 
                            placeholder="Nhập tên địa điểm..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                </form>

                <div className="nav-links">
                    <button onClick={onOpenModal} className="nav-button">
                        Tỉnh - Thành phố
                    </button>
                </div>
            </nav>
            </div>
        </header>
    );
}

export default AppHeader;