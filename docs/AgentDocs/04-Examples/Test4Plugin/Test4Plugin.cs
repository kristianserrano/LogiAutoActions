namespace Loupedeck.Test4Plugin
{
    using System;

    using Loupedeck.Test4;

    public partial class Test4Plugin : Plugin
    {
        internal static LoupedeckService LoupedeckService { get; private set; }

        private readonly PluginPreferenceAccount _fakeAccount;

        public override Boolean UsesApplicationApiOnly => true;
        public override Boolean HasNoApplication => true;

        public Test4Plugin()
        {
            PluginLog.Init(this.Log);

            // create an "account" preference
            this._fakeAccount = new PluginPreferenceAccount("fake-account")
            {
                DisplayName = "Fake account"
            };

            // add preference to the list
            this.PluginPreferences.Add(this._fakeAccount);
        }

        private void InitSystem(LoupedeckService loupedeckService, INativeApi _) => Test4Plugin.LoupedeckService = loupedeckService;

        public override void Load()
        {
            this.Info.Icon48x48 = EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.Resources.PluginIcon48x48.png");

            this.Localization.LanguageChanged += this.OnPluginLanguageChanged;
            this.Localization.LoupedeckLanguageChanged += this.OnLoupedeckLanguageChanged;

            // subscribe to login/logout requests
            this._fakeAccount.LoginRequested += this.OnFakeAccountLoginRequested;
            this._fakeAccount.LogoutRequested += this.OnFakeAccountLogoutRequested;

            // report error if not logged in
            if (String.IsNullOrEmpty(this._fakeAccount.AccessToken))
            {
                this._fakeAccount.ReportLogout();
            }

            const String SettingName = "PluginTestSetting";
            if (this.TryGetPluginSetting(SettingName, out var stringValue) && Int32.TryParse(stringValue, out var intValue))
            {
                Tracer.Trace($"{SettingName} exists and is {intValue}");
                intValue++;
                this.SetPluginSetting(SettingName, intValue.ToString());
            }
            else
            {
                Tracer.Trace($"{SettingName} does not exist");
                this.SetPluginSetting(SettingName, 0.ToString());
            }

            // subscribe to file content received event
            this.LoadOnlineConfiguration();
        }

        public override void Unload()
        {
            this.Localization.LanguageChanged -= this.OnPluginLanguageChanged;
            this.Localization.LoupedeckLanguageChanged -= this.OnLoupedeckLanguageChanged;

            this.UnloadOnlineConfiguration();

            // subscribe from login/logout requests
            this._fakeAccount.LoginRequested -= this.OnFakeAccountLoginRequested;
            this._fakeAccount.LogoutRequested -= this.OnFakeAccountLogoutRequested;
        }

        private void OnPluginLanguageChanged(Object sender, LanguageChangedEventArgs e)
            => Tracer.Trace($"Plugin language changed: '{e.PluginName}' '{e.Language}'");

        private void OnLoupedeckLanguageChanged(Object sender, LanguageChangedEventArgs e)
            => Tracer.Trace($"Loupedeck language changed: '{e.PluginName}' '{e.Language}'");

        private void OnFakeAccountLoginRequested(Object sender, EventArgs e)
        {
            Helpers.StartNewTask(() =>
            {
                // do fake login
                var fakeAccessToken = Helpers.NewGuid();
                System.Threading.Thread.Sleep(5_000);

                // report login and set user name and access token
                this._fakeAccount.ReportLogin("Fake User Name", fakeAccessToken, null);
            });
        }

        private void OnFakeAccountLogoutRequested(Object sender, EventArgs e)
        {
            Helpers.StartNewTask(() =>
            {
                // do fake logout
                System.Threading.Thread.Sleep(5_000);

                // report logout and clear user name and access token
                this._fakeAccount.ReportLogout();
            });
    }

        public override void RunCommand(String commandName, String parameter)
        {
            switch (commandName)
            {
                default:
                    Tracer.Trace($"Unknown command '{commandName}'");
                    break;
            }
        }

        public override void ApplyAdjustment(String adjustmentName, String parameter, Int32 diff)
        {
            switch (adjustmentName)
            {
                default:
                    Tracer.Trace($"Unknown adjustment '{adjustmentName}'");
                    break;
            }
        }

        public override Boolean Install()
        { 
            PluginLog.Info("Install method called");
            return true;
        }
    }
}
