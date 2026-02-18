import AppLogoIcon from './app-logo-icon';

type Props = {
    onWelcome: boolean;
};

export default function AppLogo({ onWelcome = false }: Props) {
    return (
        <>
            <div
                className={`flex aspect-square size-8 items-center justify-center rounded-md ${onWelcome ? 'bg-white dark:bg-black' : 'bg-sidebar-primary-foreground'} text-sidebar-primary-foreground`}
            >
                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
            </div>

            <div className="ml-1 grid flex-1 text-left text-sm">
                <span
                    className={`mb-0.5 truncate leading-tight font-semibold ${onWelcome ? 'text-black dark:text-gray-300' : ''}`}
                >
                    Intellix
                </span>
            </div>
        </>
    );
}
