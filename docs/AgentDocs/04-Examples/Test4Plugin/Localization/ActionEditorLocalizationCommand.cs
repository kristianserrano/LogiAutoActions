namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorLocalizationCommand : ActionEditorCommand
    {
        private const String LanguageControlName = "language";

        public ActionEditorLocalizationCommand()
        {
            this.DisplayName = "##ExampleActionNameAE";
            this.Description = "##ExampleActionDescriptionAE";
            this.GroupName = "##ExampleGroupNameAE";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: LanguageControlName, labelText: "Select language:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (actionParameters.TryGetString(LanguageControlName, out var message))
            {
                this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, message, null, null);
                return true;
            }

            return false;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(LanguageControlName))
            {
                foreach (var language in new[] { "English", "German", "French"})
                {
                    e.AddItem(name: $"MESSAGE_ID_{language}", displayName: language, description: $"Language is {language}");
                }
            }

            e.SetSelectedItemName(e.Items[1].Name); // select second item
        }
    }
}
