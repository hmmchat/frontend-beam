import React from "react";
import Inbox from "../../components/Home/Inbox";
import ProfileGuard from "@/components/auth/ProfileGuard";

const InboxPage = () => {
    return (
        <ProfileGuard>
            <main >
                <Inbox />
            </main>
        </ProfileGuard>
    );
};

export default InboxPage;