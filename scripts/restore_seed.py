#!/usr/bin/env python3
"""One-off: restore data.json with the full portfolio seed content."""
import json

data = {
    "profile": {
        "name": "Salai Thant Zaw Win",
        "kicker": "Hi, I'm",
        "roles": [
            "IT Infrastructure Manager",
            "Network & Systems Engineer",
            "Windows Server & Exchange Admin",
            "Firewall & Security Practitioner",
            "VMware Virtualization Specialist",
        ],
        "summary": "15+ years keeping servers, networks and security running reliably — Windows/Active Directory, Exchange, Cisco & FortiGate, and VMware — with clear documentation and calm, steady operations.",
        "photo": "assets/profile.jpg",
        "stats": [
            {"value": 16, "suffix": "", "label": "Years in IT"},
            {"value": 99.9, "suffix": "%", "label": "Network uptime"},
            {"value": 80, "suffix": "%", "label": "Email reliability gain"},
        ],
    },
    "about": {
        "kicker": "Who I am",
        "title": "About me",
        "paragraphs": [
            "I have spent over 15 years supporting and improving IT infrastructure — servers, networks, and security — with a steady focus on reliable day-to-day operations and clear documentation.",
            "I work comfortably with Windows/Active Directory, Exchange, networking equipment, firewalls, and VMware, and I coordinate with vendors and other departments when changes or issues arise. I aim to keep systems stable, secure, and understandable for the organization.",
        ],
        "facts": [
            {"label": "Location", "value": "Yangon, Myanmar", "link": ""},
            {"label": "Email", "value": "salaithantzawwin@gmail.com", "link": "mailto:salaithantzawwin@gmail.com"},
            {"label": "Phone", "value": "+95 9 250 061 085 (WhatsApp)", "link": "tel:+959250061085"},
            {"label": "Languages", "value": "Myanmar (native), English (fluent)", "link": ""},
            {"label": "Interests", "value": "Sports · Traveling · Singing", "link": ""},
        ],
    },
    "experience": {
        "kicker": "Career",
        "title": "Work experience",
        "jobs": [
            {
                "id": "job-1",
                "role": "IT Manager",
                "company": "Golden Legend Group",
                "period": "Nov 2025 – Present",
                "current": True,
                "icon": "🖥️",
                "bullets": [
                    "Single point of contact for IT in a small organization: daily support, server/network issues, and urgent breakdowns with limited backup staff.",
                    "Secured systems with practical controls: firewall rules, access policies, and patching discipline appropriate for a small budget and real risk.",
                    "Stretched hardware and licenses through virtualization (VMware ESXi) and consolidation to reduce cost while keeping performance acceptable.",
                    "Owned backups and recovery: schedules, periodic checks, and documented restore steps so recovery isn't guesswork.",
                    "Worked directly with users and managers: clear explanations, quick triage, and sensible priorities across departments.",
                    "Coordinated vendors and ISPs and followed cases through until services were restored.",
                    "Documented as we went: simple SOPs, network notes, and change records so knowledge isn't only in one person's head.",
                    "Planned upgrades carefully: tested changes, used maintenance windows, and communicated impact.",
                ],
            },
            {
                "id": "job-2",
                "role": "Assistant IT Manager",
                "company": "Great Foundation & SamPar Oo Co., Ltd",
                "period": "May 2009 – Oct 2025",
                "current": False,
                "icon": "🛡️",
                "bullets": [
                    "Owned day-to-day IT infrastructure: Windows servers, Active Directory, Group Policy, and Microsoft Exchange — stable, patched, and aligned with access and security needs.",
                    "Designed and operated the LAN/WAN: VLANs, routing, Cisco routers/switches, plus Mikrotik/Ruijie switching; tuned segmentation and performance for business use.",
                    "Secured the perimeter and internal controls: FortiGate firewalls, firewall policies, and complementary controls (IDS where used); supported safe remote access.",
                    "Ran proactive operations: monitoring, capacity/health checks, and incident handling to limit downtime and repeat issues.",
                    "Planned and executed upgrades with cross-functional teams so changes matched business growth and maintenance windows.",
                    "Managed backup and disaster recovery: backup jobs, restore tests, and documentation so recovery steps were clear under pressure.",
                    "Virtualized and consolidated: VMware ESXi deployment and operations to improve resource use and reduce unnecessary hardware.",
                    "Coordinated third-party support: ISPs, vendors, and providers for escalations, circuits, and warranty cases through closure.",
                    "Standardized knowledge: configuration records, troubleshooting guides, and handover notes for faster, consistent resolution.",
                    "Delivered end-user IT support: prioritized urgent breakdowns and service requests to keep departments productive.",
                ],
            },
        ],
    },
    "projects": {
        "kicker": "Key achievements & projects",
        "title": "Selected work",
        "items": [
            {"id": "proj-1", "icon": "🌐", "title": "Domain-Based Network Design & Implementation", "description": "Designed and deployed a robust domain-based infrastructure, enabling centralized data management, stable network performance, and streamlined resource sharing across departments — supporting overall business continuity.", "highlight": "", "image": ""},
            {"id": "proj-2", "icon": "✉️", "title": "Exchange Server Optimization & Hybrid Configuration", "description": "Optimized Exchange Server 2010 and 2013, improving email performance and reliability by {highlight}. Configured hybrid mode for seamless LAN-to-Internet email delivery and better company-wide communication.", "highlight": "80%", "image": ""},
            {"id": "proj-3", "icon": "📚", "title": "Technical Knowledge Base Development", "description": "Created and maintained comprehensive technical documentation — troubleshooting procedures and configuration guides — reducing issue resolution time by {highlight} and improving IT support efficiency.", "highlight": "15%", "image": ""},
            {"id": "proj-4", "icon": "🗄️", "title": "VMware ESXi Virtualization Deployment", "description": "Led deployment and ongoing management of VMware ESXi environments, increasing server resource efficiency by {highlight} and cutting hardware costs by 20% through optimized virtualization.", "highlight": "30%", "image": ""},
            {"id": "proj-5", "icon": "📈", "title": "Network Infrastructure Maintenance & Uptime Assurance", "description": "Oversaw company network infrastructure for over a decade, achieving {highlight} uptime and ensuring reliable, uninterrupted service for daily operations.", "highlight": "99.9%", "image": ""},
        ],
    },
    "skills": {
        "kicker": "Toolkit",
        "title": "Skills",
        "items": [
            {"id": "skill-1", "icon": "🧱", "name": "IT Infrastructure Management"},
            {"id": "skill-2", "icon": "🕸️", "name": "Network Management"},
            {"id": "skill-3", "icon": "🗄️", "name": "Server Administration"},
            {"id": "skill-4", "icon": "🔐", "name": "IT Security & Compliance"},
            {"id": "skill-5", "icon": "⚡", "name": "System Optimization"},
            {"id": "skill-6", "icon": "🤝", "name": "Team Leadership & Collaboration"},
            {"id": "skill-7", "icon": "🧰", "name": "Technical Support & Troubleshooting"},
            {"id": "skill-8", "icon": "🧭", "name": "Strategic IT Planning"},
            {"id": "skill-9", "icon": "📦", "name": "Virtualization"},
        ],
    },
    "certifications": {
        "kicker": "Credentials",
        "title": "Certifications & training",
        "items": [
            {"id": "cert-1", "icon": "🎓", "name": "Cisco Certified Network Associate (CCNA)", "issuer": "CCNA VCE · Local", "image": "certificates/Thant Zaw Win_CCNA.pdf"},
            {"id": "cert-2", "icon": "🪟", "name": "Windows Server Administration", "issuer": "IMCS · Local", "image": ""},
            {"id": "cert-3", "icon": "🏭", "name": "FSSC22000/GMP/HACCP & ISO 9001:2015 Documentation", "issuer": "SGS · 2018", "image": "certificates/FSSC 001.jpg"},
            {"id": "cert-4", "icon": "💻", "name": "Google IT Support", "issuer": "Coursera", "image": "certificates/Google IT Support.pdf"},
            {"id": "cert-5", "icon": "🛡️", "name": "Google Cybersecurity", "issuer": "Coursera", "image": ""},
        ],
    },
    "education": {
        "kicker": "Education",
        "title": "Education",
        "items": [
            {"id": "edu-1", "icon": "🎓", "degree": "Bachelor of Laws (LL.B)", "school": "Dagon University", "period": "2003 – 2007"},
        ],
    },
    "contact": {
        "kicker": "Say hello",
        "title": "Contact",
        "lead": "Looking for an experienced IT manager to keep your systems stable, secure, and well-documented? Let's talk.",
        "cards": [
            {"id": "con-1", "icon": "✉️", "label": "Email", "value": "salaithantzawwin@gmail.com", "link": "mailto:salaithantzawwin@gmail.com"},
            {"id": "con-2", "icon": "📞", "label": "Phone / WhatsApp", "value": "+95 9 250 061 085", "link": "tel:+959250061085"},
            {"id": "con-3", "icon": "📍", "label": "Location", "value": "2A (501), Mudita Housing 2, Insein, Yangon, Myanmar", "link": "https://www.google.com/maps/search/?api=1&query=Insein%2C+Yangon%2C+Myanmar"},
        ],
    },
    "footer": {
        "text": "Salai Thant Zaw Win. All rights reserved.",
        "showTop": True,
        "cvFile": "salaithantzawwin.docx",
    },
}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("data.json restored (with certificate files + cvFile)")
