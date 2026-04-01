namespace Loupedeck.Test4Plugin
{
    using System;

    public class ExecutePeriodicActionCommand : ExecuteBaseActionCommand
    {
        private const String ActionDurationControlName = "actionDuration";

        private readonly ConcurrentDictionaryNoCase<TaggedTimer> _timers = new();

        public ExecutePeriodicActionCommand()
        {
            this.DisplayName = "Execute action periodically";

            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ActionDurationControlName, labelText: "Action duration:"));
        }

        protected override Int32 GetActionCount(ActionEditorActionParameters actionParameters, Int32 actionRate) => actionParameters.TryGetInt32(ActionDurationControlName, out var actionDuration) ? actionDuration / actionRate : 0;

        protected override void OnActionEditorListboxItemsRequested(ActionEditorListboxItemsRequestedEventArgs e, String controlValue)
        {
            if (e.ControlName.EqualsNoCase(ActionDurationControlName))
            {
                e.AddItem(name: "0", displayName: "Once", description: null);
                AddActionDuration(1);
                AddActionDuration(3);
                AddActionDuration(6);
                AddActionDuration(10);
                AddActionDuration(30);
                AddActionDuration(60);
                e.AddItem(name: "-1", displayName: "Forever", description: null);

                e.SetSelectedItemName(controlValue ?? "5000");

                void AddActionDuration(Int32 actionDuration) => e.AddItem(name: $"{actionDuration * 1_000}", displayName: $"{actionDuration:N0} seconds", description: null);
            }
        }
    }
}