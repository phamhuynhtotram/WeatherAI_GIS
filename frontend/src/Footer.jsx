// File: Footer.jsx

import React, { useEffect } from 'react';

export const FontAwesomeLoader = () => {
    useEffect(() => {
        const linkExists = document.querySelector('link[href*="font-awesome"]');
        
        if (!linkExists) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
            document.head.appendChild(link);
        }
    }, []);
    return null; 
};

// Component Footer chính
function Footer({ onShowAbout }) { 
    return (
        <footer className="main-footer-container">
            {/* PHẦN TRÊN CÙNG: 2 CỘT NGANG */}
            <div className="footer-top-row">
                
                {/* CỘT 1: LIÊN HỆ */}
                <div className="ffooter-column contact-column"> 
                    <h3>Liên Hệ</h3>
                    <p className="contact-item"><i className="fa fa-envelope"></i> Email: phamhuynhtotram@gmail.com</p>
                    <p className="contact-item"><i className="fa fa-phone"></i> Phone: 0339599809</p>
                    <p className="contact-item"><i className="fa fa-map-marker"></i> Address: Đại học Nguyễn Tất Thành, Tp.HCM</p>
                </div>
                
                {/* CỘT 2: LIÊN KẾT NHANH & SOCIAL ICONS */}
                <div className="footer-column">
                    <h3>Liên kết nhanh</h3>
                    
                    {/* SOCIAL ICONS */}
                    <div className="social-right-top">
                        <a href="https://www.facebook.com/share/1JriKFEyF8/" target="_blank" rel="noopener noreferrer">
                            <i className="fa fa-facebook"></i>
                        </a>
                        <a href="https://x.com/ChamnChrm28170" target="_blank" rel="noopener noreferrer">
                            <i className="fa fa-twitter"></i>
                        </a>
                        <a href="https://www.instagram.com/tz_suzann" target="_blank" rel="noopener noreferrer">
                            <i className="fa fa-instagram"></i>
                        </a>
                    </div>
                </div>
            </div>

            {/* PHẦN DƯỚI CÙNG: 3 CỘT CHO TEXT VÀ COPYRIGHT */}
            <div className="footer-bottom-row">
                
                {/* CỘT TRÁI: DÒNG KHÓA LUẬN (CẦN CĂN GIỮA) */}
                <div className="thesis-center">
                    Developing a web application for analyzing and forecasting weather using AI and GIS
                </div>

                {/* CỘT PHẢI: COPYRIGHT */}
                <div className="copyright-left">
                    © 2025 Phát triển ứng dụng web phân tích và dự báo thời tiết bằng AI và GIS
                </div>
            </div>
        </footer>
    );
}

export default Footer;