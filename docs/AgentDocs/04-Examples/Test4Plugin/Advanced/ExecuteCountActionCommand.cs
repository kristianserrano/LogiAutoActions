namespace Loupedeck.Test4Plugin
{
    using System;

    public class ExecuteCountActionCommand : ExecuteBaseActionCommand
    {
        private const String ActionCountControlName = "actionCount";

        public ExecuteCountActionCommand()
        {
            this.DisplayName = "Execute action N times";

            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ActionCountControlName, labelText: "Action count:"));
        }

        protected override Int32 GetActionCount(ActionEditorActionParameters actionParameters, Int32 actionRate) => actionParameters.TryGetInt32(ActionCountControlName, out var actionCount) ? actionCount : 0;

        protected override void OnActionEditorListboxItemsRequested(ActionEditorListboxItemsRequestedEventArgs e, String controlValue)
        {
            if (e.ControlName.EqualsNoCase(ActionCountControlName))
            {
                for (var i = 1; i < 10; i++)
                {
                    AddActionCount(i);
                }
                for (var i = 1; i < 10; i++)
                {
                    AddActionCount(i * 10);
                }
                for (var i = 1; i < 19; i++)
                {
                    AddActionCount(i * 50);
                }

                e.SetSelectedItemName(controlValue ?? "10");

                void AddActionCount(Int32 actionCount) => e.AddItem(name: $"{actionCount}", displayName: $"{actionCount:N0} times", description: null);
            }
        }
    }
}